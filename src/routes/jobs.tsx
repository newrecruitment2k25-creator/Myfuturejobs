import React from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { SiteFooter } from "@/components/site-header";
import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import {
  MapPin, DollarSign, GraduationCap, Briefcase, Search, SlidersHorizontal,
  X, Loader2, Building2, Clock, CheckCircle2, Brain, Sparkles, Bookmark, Share2, Factory,
  Tag, ChevronDown, BarChart2,
} from "lucide-react";
import {
  parseSearchQuery as parseQueryNLP, scoreJob, scoreToPercent,
  saveRecentSearch, getRecentSearches,
  parseSearchQueryAI, fuzzyMatch, normaliseBmQuery,
  type ParsedQuery,
  needsAIParsing, buildParsedSummary, type ParsedSearchQuery, SYNONYMS,
  extractLocations, normalizeLocation,
} from "@/lib/smart-search.functions";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { useLanguage } from "@/lib/language-context";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { expandKeywords } from '@/lib/taxonomy-map';
import { buildUserInterestVector, personaliseJob, buildPersonalisedChips, type UserInterestVector, EMPTY_VECTOR } from '@/lib/user-profile';

export const Route = createFileRoute("/jobs")({
  ssr: false,
  component: JobsPage,
  head: () => ({
    meta: [
      { title: "Jobs in Malaysia — MYFutureJobs" },
      { name: "description", content: "Browse active job vacancies from Malaysia's national job portal. Filter by location, salary, education, and more." },
    ],
  }),
});

// ── Constants ────────────────────────────────────────────────────────────────
const MY_STATES = [
  "Johor", "Kedah", "Kelantan", "Kuala Lumpur", "Labuan", "Melaka",
  "Negeri Sembilan", "Pahang", "Perak", "Perlis", "Pulau Pinang",
  "Putrajaya", "Sabah", "Sarawak", "Selangor", "Terengganu",
];

const INDUSTRIES = [
  "Technology", "Finance", "Healthcare", "Manufacturing", "Retail",
  "Education", "Government", "Construction", "Oil & Gas",
  "Telecommunications", "Other",
];

const SALARY_RANGES = [
  { label: "All Salaries", value: "all" },
  { label: "Below RM2,000", value: "0-1999" },
  { label: "RM2,000 – RM3,999", value: "2000-3999" },
  { label: "RM4,000 – RM5,999", value: "4000-5999" },
  { label: "RM6,000 – RM9,999", value: "6000-9999" },
  { label: "RM10,000+", value: "10000-999999" },
];

const EDU_LEVELS = [
  "SPM", "Diploma", "Bachelor", "Master", "PhD",
];

const PAGE_SIZE = 20;

// ── Client-side search parser ────────────────────────────────────────────────
const STATE_MAP: Record<string, string> = {
  'kuala lumpur': 'Kuala Lumpur', 'kl': 'Kuala Lumpur', 'klang valley': 'Kuala Lumpur',
  'selangor': 'Selangor', 'shah alam': 'Selangor', 'petaling jaya': 'Selangor',
  'pj': 'Selangor', 'cyberjaya': 'Selangor', 'subang': 'Selangor', 'puchong': 'Selangor',
  'johor': 'Johor', 'jb': 'Johor', 'johor bahru': 'Johor',
  'penang': 'Pulau Pinang', 'pulau pinang': 'Pulau Pinang',
  'perak': 'Perak', 'ipoh': 'Perak',
  'sabah': 'Sabah', 'kota kinabalu': 'Sabah', 'kk': 'Sabah',
  'sarawak': 'Sarawak', 'kuching': 'Sarawak',
  'kedah': 'Kedah', 'alor setar': 'Kedah',
  'kelantan': 'Kelantan', 'kota bharu': 'Kelantan',
  'terengganu': 'Terengganu',
  'melaka': 'Melaka', 'malacca': 'Melaka',
  'pahang': 'Pahang', 'kuantan': 'Pahang',
  'negeri sembilan': 'Negeri Sembilan',
  'perlis': 'Perlis', 'putrajaya': 'Putrajaya', 'labuan': 'Labuan',
};

function parseSearchLocally(query: string): { keywords: string; state: string | null; states: string[] } {
  if (!query) return { keywords: '', state: null, states: [] };
  let lower = query.toLowerCase().trim();
  const foundStates: string[] = [];

  // Check longest location keys first, collect ALL matches
  const sortedKeys = Object.keys(STATE_MAP).sort((a, b) => b.length - a.length);
  for (const key of sortedKeys) {
    if (lower.includes(key)) {
      const mapped = STATE_MAP[key];
      if (!foundStates.includes(mapped)) foundStates.push(mapped);
      lower = lower.replace(key, '');
    }
  }

  // Remove conjunctions and filler words
  lower = lower
    .replace(/\b(and|or|,)\b/g, ' ')
    .replace(/\b(in|at|near|around|for|the|a|an|jobs?|work|vacancy|vacancies|position|positions|remote)\b/g, '')
    .replace(/\s+/g, ' ')
    .trim();

  return { keywords: lower, state: foundStates[0] ?? null, states: foundStates };
}

// ── Types ─────────────────────────────────────────────────────────────────────
type JobCard = {
  id: string;
  source: "poc" | "employer";
  job_title: string;
  company_name: string | null;
  state: string | null;
  city: string | null;
  salary: string | null;
  salary_min: number | null;
  salary_max: number | null;
  education_level: string | null;
  skills: string | null;
  occupation_name: string | null;
  created_at: string | null;
  industry: string | null;
  job_description?: string | null;
  field_of_study?: string | null;
  semanticScore?: number | null;
};

type JobDetail = JobCard & {
  full_description?: string | null;
  all_skills?: string[];
};

type ApplicationStatus = { [jobKey: string]: "applied" | "loading" };

function timeAgo(iso: string | null): string {
  if (!iso) return "";
  const diff = Date.now() - new Date(iso).getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days}d ago`;
  if (days < 30) return `${Math.floor(days / 7)}w ago`;
  return `${Math.floor(days / 30)}m ago`;
}

function skillList(raw: string | null): string[] {
  if (!raw) return [];
  return raw.split(/[,;|]+/).map((s) => s.trim()).filter(Boolean);
}

function salaryDisplay(job: JobCard): string {
  if (job.salary) return job.salary.startsWith("RM") ? job.salary : `RM ${job.salary}`;
  if (job.salary_min != null && job.salary_max != null)
    return `RM ${job.salary_min.toLocaleString()} – RM ${job.salary_max.toLocaleString()}`;
  if (job.salary_min != null) return `From RM ${job.salary_min.toLocaleString()}`;
  return "Salary not specified";
}

// ── Apply Modal ───────────────────────────────────────────────────────────────
function ApplyModal({
  job, onClose, onSuccess,
}: { job: JobCard | null; onClose: () => void; onSuccess: (key: string) => void }) {
  const { user } = useAuth();
  const [coverLetter, setCoverLetter] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (!job) return null;

  const jobKey = job.source === "poc" ? `poc:${job.id}` : `job:${job.id}`;

  const submit = async () => {
    if (!user) return;
    setSubmitting(true);
    try {
      const payload: Record<string, unknown> = {
        user_id: user.id,
        status: "applied",
        cover_letter: coverLetter || null,
      };
      if (job.source === "poc") payload.poc_vacancy_id = job.id;
      else payload.job_id = job.id;

      const { error } = await supabase.from("applications").insert(payload as any);
      if (error) throw error;
      toast.success("Application submitted! 🎉");
      onSuccess(jobKey);
      onClose();
    } catch (e: any) {
      toast.error(e.message ?? "Failed to submit application.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Apply to {job.job_title}</DialogTitle>
          <DialogDescription>
            {job.company_name ?? job.occupation_name ?? "PERKESO Vacancy"}
            {job.state ? ` · ${job.state}` : ""}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <div className="space-y-1.5">
            <Label>Cover Letter <span className="text-muted-foreground font-normal">(optional)</span></Label>
            <Textarea
              placeholder="Briefly introduce yourself and why you're a great fit…"
              rows={5}
              value={coverLetter}
              onChange={(e) => setCoverLetter(e.target.value)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={submit} disabled={submitting}>
            {submitting && <Loader2 className="size-4 mr-2 animate-spin" />}
            Submit Application
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Highlight query terms in text ─────────────────────────────────────────────
function HighlightText({ text, query }: { text: string; query: string }) {
  if (!query.trim()) return <>{text}</>;
  const words = query.trim().split(/\s+/).filter(Boolean);
  const regex = new RegExp(`(${words.map(w => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})`, 'gi');
  const parts = text.split(regex);
  return (
    <>
      {parts.map((part, i) =>
        regex.test(part)
          ? <mark key={i} style={{ background: 'rgba(243,108,33,0.15)', color: 'var(--accent-dim)', borderRadius: 2, padding: '0 1px' }}>{part}</mark>
          : part
      )}
    </>
  );
}

// ── Smart Search Bar with Autocomplete ────────────────────────────────────────
const DEFAULT_CHIPS = [
  "Software Engineer KL", "Fresh Grad Finance", "Remote Data Analyst",
  "Senior HR Selangor", "Mechanical Engineer Penang", "Customer Service",
];

const BM_EN_DEMO_CHIPS = [
  { label: "jurutera perisian",  hint: "BM → software engineer" },
  { label: "jururawat",          hint: "BM → nurse" },
  { label: "pemandu lori",       hint: "BM → lorry driver" },
  { label: "kerani akaun",       hint: "BM → account clerk" },
  { label: "programmer",        hint: "EN → software developer" },
  { label: "doctor",            hint: "EN → medical officer" },
];

function SmartSearchBar({
  value, onChange, onSearch, jobs, total, parsedQuery, hasSearched,
  personalChips, userVector, semanticActive, locationFilters,
}: {
  value: string;
  onChange: (v: string) => void;
  onSearch: (q?: string) => void;
  jobs: JobCard[];
  total: number;
  parsedQuery: ParsedQuery | null;
  hasSearched: boolean;
  personalChips: string[];
  userVector: UserInterestVector;
  semanticActive: boolean;
  locationFilters: string[];
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [showDrop, setShowDrop] = useState(false);
  const [highlightIdx, setHighlightIdx] = useState(-1);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => { setRecentSearches(getRecentSearches()); }, []);

  // Autocomplete suggestions
  const suggestions = useMemo(() => {
    if (!value || value.length < 2) return [];
    const q = value.toLowerCase();
    const seen = new Set<string>();
    const results: { type: "title" | "company" | "skill" | "recent"; text: string }[] = [];
    // Recent
    getRecentSearches().filter(r => r.toLowerCase().includes(q)).forEach(r => {
      if (!seen.has(r)) { seen.add(r); results.push({ type: "recent", text: r }); }
    });
    // Titles — exact then fuzzy fallback
    jobs.filter(j => j.job_title.toLowerCase().includes(q) || fuzzyMatch(q, j.job_title)).slice(0, 3).forEach(j => {
      if (!seen.has(j.job_title)) { seen.add(j.job_title); results.push({ type: "title", text: j.job_title }); }
    });
    // Companies
    jobs.filter(j => (j.company_name ?? "").toLowerCase().includes(q)).slice(0, 2).forEach(j => {
      const c = j.company_name ?? j.occupation_name ?? "";
      if (c && !seen.has(c)) { seen.add(c); results.push({ type: "company", text: c }); }
    });
    // Skills — exact then fuzzy fallback
    const skillSet = new Set<string>();
    jobs.forEach(j => {
      (j.skills ?? "").split(/[,;|]+/).map(s => s.trim()).filter(Boolean).forEach(s => {
        if ((s.toLowerCase().includes(q) || fuzzyMatch(q, s)) && !skillSet.has(s)) {
          skillSet.add(s);
          results.push({ type: "skill", text: s });
        }
      });
    });

    return results.slice(0, 6);
  }, [value, jobs]);

  const handleInput = (v: string) => {
    onChange(v);
    setShowDrop(true);
    setHighlightIdx(-1);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {}, 200);
  };

  const handleSelect = (text: string) => {
    onChange(text);
    setShowDrop(false);
    onSearch(text);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") { setHighlightIdx(i => Math.min(i + 1, suggestions.length - 1)); e.preventDefault(); }
    else if (e.key === "ArrowUp") { setHighlightIdx(i => Math.max(i - 1, -1)); e.preventDefault(); }
    else if (e.key === "Enter") {
      if (highlightIdx >= 0 && suggestions[highlightIdx]) handleSelect(suggestions[highlightIdx].text);
      else { setShowDrop(false); onSearch(); }
    }
    else if (e.key === "Escape") setShowDrop(false);
  };


  const iconMap = { title: <Briefcase className="size-3.5" />, company: <Building2 className="size-3.5" />, skill: <Tag className="size-3.5" />, recent: <Clock className="size-3.5" /> };
  const labelMap = { title: "Job", company: "Company", skill: "Skill", recent: "Recent" };

  return (
    <div style={{ background: 'var(--surface)', borderBottom: '1px solid var(--line)' }}>
      <div className="mx-auto max-w-5xl px-4 sm:px-6 py-5">
        {/* Big search card */}
        <div style={{ position: 'relative' }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 12,
            background: 'var(--surface)', border: '1.5px solid var(--line)',
            borderRadius: 14, padding: '10px 12px 10px 18px',
            boxShadow: '0 2px 12px rgba(10,38,71,0.06)',
            minHeight: 56, transition: 'border-color 0.15s',
          }}>
            <Search style={{ width: 18, height: 18, color: '#205295', opacity: 0.7, flexShrink: 0 }} />
            <input
              ref={inputRef}
              value={value}
              onChange={e => handleInput(e.target.value)}
              onKeyDown={handleKeyDown}
              onFocus={() => setShowDrop(true)}
              onBlur={() => setTimeout(() => setShowDrop(false), 160)}
              placeholder="Job title, skills, location, salary… try 'software engineer KL 5k'"
              style={{
                flex: 1, border: 'none', outline: 'none', fontSize: 14,
                fontWeight: 500, color: 'var(--ink)', background: 'transparent',
              }}
            />
            {value && (
              <button onClick={() => { onChange(""); inputRef.current?.focus(); }}
                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, color: 'var(--muted)' }}>
                <X style={{ width: 16, height: 16 }} />
              </button>
            )}
            <button
              onClick={() => onSearch()}
              style={{
                display: 'flex', alignItems: 'center', gap: 8,
                background: 'linear-gradient(135deg, #0A2647 0%, #205295 100%)', color: '#fff', border: 'none',
                borderRadius: 10, padding: '9px 22px', fontSize: 13,
                fontWeight: 700, cursor: 'pointer', flexShrink: 0,
                boxShadow: '0 2px 8px rgba(10,38,71,0.15)',
              }}
            >
              <Search style={{ width: 15, height: 15 }} /> Search
            </button>
          </div>
          <p style={{ fontSize: 12, color: 'var(--muted)', margin: '8px 0 0 2px' }}>
            Search in <strong>Bahasa Melayu or English</strong> — semantic AI understands both. Try: "jurutera perisian" → software engineer roles.
          </p>
          {/* BM+EN demo chips */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 10, alignItems: 'center' }}>
            <span style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 700 }}>🌐 Multilingual demo:</span>
            {BM_EN_DEMO_CHIPS.map(chip => (
              <button key={chip.label} onClick={() => { onChange(chip.label); onSearch(chip.label); }}
                title={chip.hint}
                style={{ fontSize: 11, fontWeight: 700, color: '#205295', background: 'rgba(32,82,149,0.06)', border: '1px solid rgba(32,82,149,0.12)', borderRadius: 999, padding: '3px 10px', cursor: 'pointer', transition: 'all 0.15s' }}>
                {chip.label}
              </button>
            ))}
          </div>

          {/* Autocomplete dropdown */}
          {showDrop && (value.length >= 2 ? suggestions.length > 0 : recentSearches.length > 0) && (
            <div style={{
              position: 'absolute', top: '100%', left: 0, right: 0,
              background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 14,
              boxShadow: '0 8px 32px rgba(10,38,71,0.12)',
              zIndex: 100, marginTop: 6, overflow: 'hidden',
            }}>
              {(value.length < 2 ? recentSearches.map(r => ({ type: "recent" as const, text: r })) : suggestions).map((s, i) => (
                <div
                  key={i}
                  onMouseDown={() => handleSelect(s.text)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '10px 16px', cursor: 'pointer',
                    background: highlightIdx === i ? 'rgba(32,82,149,0.06)' : 'transparent',
                    borderBottom: i < suggestions.length - 1 ? '1px solid var(--line)' : 'none',
                  }}
                >
                  <span style={{ color: 'var(--muted)' }}>{iconMap[s.type]}</span>
                  <span style={{ flex: 1, fontSize: 13, fontWeight: 500, color: 'var(--ink)' }}>{s.text}</span>
                  <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--muted)', background: 'var(--base)', borderRadius: 6, padding: '2px 8px' }}>{labelMap[s.type]}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Quick chips (pre-search) — personalised when logged in */}
        {!hasSearched && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 12, alignItems: 'center' }}>
            {personalChips.length > 0 ? (
              <>
                <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, fontWeight: 600, color: '#f36c21' }}>
                  <Sparkles style={{ width: 12, height: 12 }} /> For you:
                </span>
                {personalChips.map(chip => (
                  <button key={chip} onMouseDown={() => handleSelect(chip)}
                    style={{
                      fontSize: 12, fontWeight: 600, color: '#f36c21', cursor: 'pointer',
                      background: 'rgba(243,108,33,0.08)', border: '1px solid rgba(243,108,33,0.25)',
                      borderRadius: 8, padding: '4px 12px', transition: 'all 0.15s',
                    }}>
                    {chip}
                  </button>
                ))}
              </>
            ) : (
              <>
                <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--muted)' }}>Try:</span>
                {DEFAULT_CHIPS.map(chip => (
                  <button key={chip} onMouseDown={() => handleSelect(chip)}
                    style={{
                      fontSize: 12, fontWeight: 600, color: '#205295', cursor: 'pointer',
                      background: 'rgba(32,82,149,0.06)', border: '1px solid var(--line)',
                      borderRadius: 8, padding: '4px 12px', transition: 'all 0.15s',
                    }}>
                    {chip}
                  </button>
                ))}
              </>
            )}
          </div>
        )}

        {/* Intent bar (post-search) */}
        {hasSearched && parsedQuery && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 10, alignItems: 'center' }}>
            <Sparkles style={{ width: 13, height: 13, color: '#f36c21' }} />
            <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--muted)', marginRight: 4 }}>Understood:</span>
            {parsedQuery.role && (
              <span style={{ fontSize: 11, fontWeight: 600, background: '#205295', color: '#fff', borderRadius: 6, padding: '2px 8px' }}>{parsedQuery.role}</span>
            )}
            {Array.from(new Set([...parsedQuery.locations, ...locationFilters])).map(l => (
              <span key={l} style={{ fontSize: 11, fontWeight: 600, background: '#0d9488', color: '#fff', borderRadius: 6, padding: '2px 8px' }}>{l}</span>
            ))}
            {parsedQuery.sector && (
              <span style={{ fontSize: 11, fontWeight: 600, background: '#f36c21', color: '#fff', borderRadius: 6, padding: '2px 8px' }}>{parsedQuery.sector}</span>
            )}
            {parsedQuery.expLevel && (
              <span style={{ fontSize: 11, fontWeight: 600, background: '#6d28d9', color: '#fff', borderRadius: 6, padding: '2px 8px' }}>{parsedQuery.expLevel}</span>
            )}
            {parsedQuery.jobType && (
              <span style={{ fontSize: 11, fontWeight: 600, background: '#0369a1', color: '#fff', borderRadius: 6, padding: '2px 8px' }}>{parsedQuery.jobType}</span>
            )}
            {(parsedQuery.salaryMin > 0 || parsedQuery.salaryMax > 0) && (
              <span style={{ fontSize: 11, fontWeight: 600, background: '#15803d', color: '#fff', borderRadius: 6, padding: '2px 8px' }}>
                RM{parsedQuery.salaryMin > 0 ? parsedQuery.salaryMin.toLocaleString() : "0"}
                {parsedQuery.salaryMax < 999999 ? `–${parsedQuery.salaryMax.toLocaleString()}` : "+"}
              </span>
            )}
            <span style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 500, marginLeft: 4 }}>
              {total > 0 ? `${total.toLocaleString()} jobs found` : "No jobs found"}
            </span>
            {semanticActive && (
              <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 10, fontWeight: 700, color: '#205295', background: 'rgba(32,82,149,0.08)', borderRadius: 999, padding: '2px 8px', marginLeft: 4 }}>
                <Sparkles style={{ width: 9, height: 9 }} /> Semantic AI ranking active
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Company Logo Placeholder ───────────────────────────────────────────────────
function CompanyLogo({ name, size = "md" }: { name: string | null; size?: "sm" | "md" | "lg" }) {
  const letter = (name ?? "P").charAt(0).toUpperCase();
  const gradients = [
    'linear-gradient(145deg, var(--brand), #5c57d6)',
    'linear-gradient(145deg, var(--accent), #ff9d66)',
    'linear-gradient(145deg, #0f766e, #2dd4bf)',
    'linear-gradient(145deg, #2563eb, #38bdf8)',
    'linear-gradient(145deg, #6d28d9, #c4a1ff)',
    'linear-gradient(145deg, #ea580c, #facc15)',
  ];
  const gradient = gradients[letter.charCodeAt(0) % gradients.length];
  const dims = size === "sm" ? { width: 38, height: 38, fontSize: 13, borderRadius: 10 } : size === "lg" ? { width: 54, height: 54, fontSize: 20, borderRadius: 14 } : { width: 44, height: 44, fontSize: 16, borderRadius: 12 };
  return (
    <div style={{ ...dims, background: gradient, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, color: '#fff', flexShrink: 0, letterSpacing: '-0.02em' }}>
      {letter}
    </div>
  );
}

// ── Job Card Component ─────────────────────────────────────────────────────────
function JobCard({
  job, isSelected, onSelect, isApplied, isSaved, onToggleSave, score, query,
}: {
  job: JobCard; isSelected: boolean; onSelect: () => void;
  isApplied: boolean; canApply: boolean; onApply: () => void;
  isSaved: boolean; onToggleSave: () => void;
  score: number | null; query: string;
}) {
  const displayName = job.company_name ?? job.occupation_name ?? "PERKESO";
  const location = [job.city, job.state].filter(Boolean).join(", ");
  const matchPillColor = score !== null
    ? score >= 80 ? 'var(--brand)' : score >= 60 ? 'var(--accent)' : 'var(--muted)'
    : null;

  return (
    <div
      style={{
        position: 'relative', padding: '14px 16px', cursor: 'pointer',
        borderBottom: '1px solid var(--line)',
        borderLeft: isSelected ? '3px solid #f36c21' : '3px solid transparent',
        background: isSelected ? 'rgba(243,108,33,0.04)' : 'var(--surface)',
        transition: 'all 0.15s',
      }}
      onClick={onSelect}
      onMouseEnter={e => { if (!isSelected) (e.currentTarget as HTMLElement).style.background = 'rgba(32,82,149,0.02)'; }}
      onMouseLeave={e => { if (!isSelected) (e.currentTarget as HTMLElement).style.background = 'var(--surface)'; }}
    >
      <div style={{ display: 'flex', gap: 10 }}>
        <CompanyLogo name={displayName} size="sm" />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 6 }}>
            <h3 style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink)', lineHeight: 1.3, margin: 0 }}>
              <HighlightText text={job.job_title} query={query} />
            </h3>
            <button onClick={e => { e.stopPropagation(); onToggleSave(); }} title={isSaved ? "Remove from saved" : "Save job"}
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2, flexShrink: 0 }}>
              <Bookmark style={{ width: 14, height: 14, color: isSaved ? '#f36c21' : isApplied ? '#205295' : 'var(--muted)', fill: isSaved ? '#f36c21' : 'none' }} />
            </button>
          </div>
          <p style={{ fontSize: 11, fontWeight: 600, color: '#f36c21', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{displayName}</p>
          {location && (
            <p style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 11, fontWeight: 500, color: 'var(--muted)', marginTop: 3 }}>
              <MapPin style={{ width: 11, height: 11 }} />{location}
            </p>
          )}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 6, flexWrap: 'wrap' }}>
            {score !== null && (
              <span style={{
                display: 'inline-flex', alignItems: 'center', gap: 3,
                fontSize: 10, fontWeight: 700, color: '#fff',
                background: matchPillColor!, borderRadius: 999,
                padding: '2px 7px',
              }}>
                <Brain style={{ width: 9, height: 9 }} />{score}%
              </span>
            )}
            {(job.salary || (job.salary_min != null && job.salary_max != null)) && (
              <span style={{
                display: 'inline-flex', alignItems: 'center', gap: 3,
                fontSize: 10, fontWeight: 700, color: '#fff',
                background: '#f36c21', borderRadius: 999,
                padding: '2px 7px', marginLeft: 'auto',
              }}>
                <DollarSign style={{ width: 9, height: 9 }} />{salaryDisplay(job)}
              </span>
            )}
            <span style={{ fontSize: 10, fontWeight: 500, color: 'var(--muted)' }}>
              {job.created_at ? timeAgo(job.created_at) : "Today"}
            </span>
          </div>
          {isApplied && (
            <span style={{ fontSize: 10, fontWeight: 600, color: '#15803d', background: '#dcfce7', borderRadius: 6, padding: '2px 7px', display: 'inline-block', marginTop: 4 }}>Applied ✓</span>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Info Box ────────────────────────────────────────────────────────────────────
function InfoBox({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string }) {
  return (
    <div style={{ background: 'var(--base)', border: '1px solid var(--line)', borderRadius: 10, padding: '10px 14px', transition: 'border-color 0.15s' }}
      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(32,82,149,0.2)'; }}
      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--line)'; }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'var(--muted)', marginBottom: 3 }}>
        <Icon style={{ width: 13, height: 13, color: '#f36c21', flexShrink: 0 }} />{label}
      </div>
      <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)', margin: 0, lineHeight: 1.3 }}>{value}</p>
    </div>
  );
}

// ── Job Detail Component ───────────────────────────────────────────────────────
function JobDetail({
  job, isApplied, canApply, onApply, loading
}: {
  job: JobDetail | null; isApplied: boolean; canApply: boolean; onApply: () => void; loading: boolean;
}) {
  if (!job) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <div style={{ width: 56, height: 56, borderRadius: 14, background: 'var(--base)', border: '1px solid var(--line)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}>
            <Briefcase style={{ width: 24, height: 24, color: 'var(--muted)' }} />
          </div>
          <p style={{ fontSize: 14, color: 'var(--muted)', fontWeight: 500 }}>Select a job to view details</p>
        </div>
      </div>
    );
  }

  const displayName = job.company_name ?? job.occupation_name ?? "PERKESO Vacancy";
  const location = [job.city, job.state].filter(Boolean).join(", ") || "Malaysia";
  const skills = skillList(job.skills);

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: 'var(--surface)' }}>
      {/* Sticky header */}
      <div style={{ position: 'sticky', top: 0, padding: '16px 24px', zIndex: 10, background: 'var(--surface)', borderBottom: '1px solid var(--line)' }}>
        <div className="flex items-start gap-4">
          <CompanyLogo name={displayName} size="lg" />
          <div className="flex-1 min-w-0">
            <h1 style={{ fontSize: 17, fontWeight: 800, letterSpacing: '-0.02em', color: 'var(--ink)', margin: 0, lineHeight: 1.3 }}>{job.job_title}</h1>
            <p style={{ fontSize: 13, fontWeight: 600, color: '#f36c21', marginTop: 3 }}>{displayName}</p>
            <p style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: 'var(--muted)', marginTop: 4 }}>
              <MapPin style={{ width: 13, height: 13, color: '#205295', flexShrink: 0 }} />{location}
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0 flex-wrap">
            {isApplied ? (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 13, fontWeight: 600, color: '#15803d', background: '#dcfce7', borderRadius: 8, padding: '6px 12px' }}>
                <CheckCircle2 style={{ width: 14, height: 14 }} /> Applied ✓
              </span>
            ) : canApply ? (
              <button onClick={onApply} disabled={loading} style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                background: 'linear-gradient(135deg, #f36c21 0%, #ff8c42 100%)', color: '#fff', border: 'none',
                borderRadius: 10, padding: '8px 18px',
                fontSize: 13, fontWeight: 700, cursor: 'pointer',
                boxShadow: '0 2px 8px rgba(243,108,33,0.2)',
              }}>
                {loading && <Loader2 className="size-4 animate-spin" />}
                Apply Now
              </button>
            ) : (
              <Link to="/login" style={{
                display: 'inline-flex', alignItems: 'center',
                background: 'linear-gradient(135deg, #f36c21 0%, #ff8c42 100%)', color: '#fff',
                borderRadius: 10, padding: '8px 18px',
                fontSize: 13, fontWeight: 700, textDecoration: 'none',
                boxShadow: '0 2px 8px rgba(243,108,33,0.2)',
              }}>Login to Apply</Link>
            )}
            {!isApplied && (
              <button title="Save job" style={{
                width: 36, height: 36, border: '1px solid var(--line)',
                borderRadius: 10, background: 'var(--surface)',
                cursor: 'pointer', display: 'flex', alignItems: 'center',
                justifyContent: 'center', color: 'var(--muted)',
                transition: 'all 0.15s',
              }}>
                <Bookmark className="size-4" />
              </button>
            )}
            <button style={{ width: 36, height: 36, border: '1px solid var(--line)', borderRadius: 10, background: 'var(--surface)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--muted)', transition: 'all 0.15s' }} title="Share">
              <Share2 className="size-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
        {/* Info boxes — 2×3 grid matching MYFutureJobs */}
        <div className="grid grid-cols-2 gap-3">
          <InfoBox icon={Briefcase} label="Contract Type" value={job.source === "employer" ? "Permanent" : "Permanent"} />
          <InfoBox icon={Clock} label="Working Hours" value="Normal Hour" />
          <InfoBox icon={Building2} label="Occupation" value={job.occupation_name ?? job.industry ?? "General"} />
          <div style={{ background: 'rgba(243,108,33,0.08)', border: '1px solid rgba(243,108,33,0.25)', borderRadius: 10, padding: '10px 14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: '#f36c21', marginBottom: 3 }}>
              <DollarSign style={{ width: 13, height: 13, color: '#f36c21', flexShrink: 0 }} />Salary
            </div>
            <p style={{ fontSize: 13, fontWeight: 700, color: '#f36c21', margin: 0, lineHeight: 1.3 }}>{salaryDisplay(job)}</p>
          </div>
          <InfoBox icon={GraduationCap} label="Education" value={job.education_level ?? "Open"} />
          <InfoBox icon={Factory} label="Sector" value={job.field_of_study ?? job.industry ?? "General"} />
        </div>

        {/* Job Description */}
        {(job.job_description ?? job.full_description) && (
          <section>
            <h2 style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', color: 'var(--ink)', borderBottom: '1px solid var(--line)', paddingBottom: 8, marginBottom: 12 }}>Job Description</h2>
            <div style={{ fontSize: 13, lineHeight: 1.7, color: 'var(--muted)', whiteSpace: 'pre-wrap' }}>
              {job.full_description ?? job.job_description}
            </div>
          </section>
        )}

        {/* Skills */}
        {skills.length > 0 && (
          <section>
            <h2 style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', color: 'var(--ink)', borderBottom: '1px solid var(--line)', paddingBottom: 8, marginBottom: 12 }}>Skills Required</h2>
            <div className="flex flex-wrap gap-2">
              {skills.map((skill, i) => (
                <span key={i} className="skill-chip">{skill}</span>
              ))}
            </div>
          </section>
        )}

        {/* About the Company */}
        <section>
          <h2 style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', color: 'var(--ink)', borderBottom: '1px solid var(--line)', paddingBottom: 8, marginBottom: 14 }}>About the Company</h2>
          <div style={{ borderRadius: 12, padding: 16, background: 'rgba(32,82,149,0.03)', border: '1px solid var(--line)' }}>
            <div className="flex items-center gap-3 mb-3">
              <CompanyLogo name={displayName} size="md" />
              <div>
                <p style={{ fontSize: 13, fontWeight: 700, color: '#205295', margin: 0 }}>{displayName}</p>
                <p style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>
                  <MapPin className="size-3" />{location}
                </p>
              </div>
            </div>
            {job.source === "poc" ? (
              <p style={{ fontSize: 12, lineHeight: 1.6, color: 'var(--muted)' }}>
                Employers in the <span style={{ fontWeight: 600, color: '#205295' }}>{job.occupation_name ?? "General"}</span> sector across Malaysia. Registered with PERKESO and actively hiring through MYFutureJobs.
              </p>
            ) : (
              <>
                <p style={{ fontSize: 12, lineHeight: 1.6, color: 'var(--muted)' }}>
                  {displayName} is a Malaysian employer in the <span style={{ fontWeight: 600, color: '#205295' }}>{job.industry ?? "General"}</span> sector, actively recruiting via MYFutureJobs.
                </p>
                {job.created_at && (
                  <p style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4 }}>
                    Active on MYFutureJobs since {new Date(job.created_at).toLocaleDateString("en-MY", { month: "long", year: "numeric" })}
                  </p>
                )}
              </>
            )}
          </div>
        </section>

        {/* Posted date */}
        {job.created_at && (
          <p style={{ fontSize: 12, color: 'var(--muted)' }}>
            Posted: {new Date(job.created_at).toLocaleDateString("en-MY", { year: "numeric", month: "long", day: "numeric" })}
          </p>
        )}
      </div>
    </div>
  );
}

// ── Filter Sidebar ────────────────────────────────────────────────────────────
function FilterSidebar({
  jobTypeFilter, setJobTypeFilter,
  expFilter, setExpFilter,
  sectorFilter, setSectorFilter,
  salaryFilter, setSalaryFilter,
  sortBy, setSortBy,
  onClear,
}: {
  jobTypeFilter: string; setJobTypeFilter: (v: string) => void;
  expFilter: string; setExpFilter: (v: string) => void;
  sectorFilter: string; setSectorFilter: (v: string) => void;
  salaryFilter: string; setSalaryFilter: (v: string) => void;
  sortBy: string; setSortBy: (v: string) => void;
  onClear: () => void;
}) {
  const pill = (label: string, active: boolean, onClick: () => void) => (
    <button key={label} onClick={onClick} style={{
      fontSize: 11, fontWeight: 600, borderRadius: 8, padding: '4px 10px', cursor: 'pointer',
      background: active ? 'linear-gradient(135deg, #0A2647 0%, #205295 100%)' : 'var(--base)', color: active ? '#fff' : 'var(--ink)',
      border: active ? 'none' : '1px solid var(--line)', transition: 'all 0.15s',
    }}>{label}</button>
  );

  return (
    <div style={{ background: 'var(--surface)', borderBottom: '1px solid var(--line)', padding: '10px 16px' }}>
      <div className="mx-auto max-w-5xl" style={{ display: 'flex', gap: 20, flexWrap: 'wrap', alignItems: 'flex-start' }}>
        {/* Sort */}
        <div>
          <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 5 }}>Sort</div>
          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
            {["Best Match", "Most Recent", "Highest Salary"].map(s => pill(s, sortBy === s, () => setSortBy(s)))}
          </div>
        </div>
        {/* Job Type */}
        <div>
          <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 5 }}>Type</div>
          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
            {["All", "Full-time", "Part-time", "Remote", "Contract", "Internship"].map(s =>
              pill(s, jobTypeFilter === s, () => setJobTypeFilter(s)))}
          </div>
        </div>
        {/* Experience */}
        <div>
          <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 5 }}>Experience</div>
          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
            {["All", "Fresh Graduate", "Junior", "Mid", "Senior"].map(s =>
              pill(s, expFilter === s, () => setExpFilter(s)))}
          </div>
        </div>
        {/* Sector */}
        <div>
          <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 5 }}>Sector</div>
          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
            {["All", "MNC", "GLC", "SME", "Startup", "Government"].map(s =>
              pill(s, sectorFilter === s, () => setSectorFilter(s)))}
          </div>
        </div>
        {/* Salary */}
        <div>
          <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 5 }}>Salary</div>
          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
            {SALARY_RANGES.map(r => pill(r.label, salaryFilter === r.value, () => setSalaryFilter(r.value)))}
          </div>
        </div>
        <button onClick={onClear} style={{ alignSelf: 'center', fontSize: 11, fontWeight: 600, color: '#f36c21', background: 'none', border: 'none', cursor: 'pointer', marginLeft: 'auto' }}>
          Clear all
        </button>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
function JobsPage() {
  const { user, loading: authLoading } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();

  // Unified search query (raw input, may contain location text)
  const [query, setQuery] = useState("");
  const [committedQuery, setCommittedQuery] = useState("");
  // Search query with location text removed — used for DB + semantic search
  const [searchQuery, setSearchQuery] = useState("");
  const [hasSearched, setHasSearched] = useState(false);
  const [semanticActive, setSemanticActive] = useState(false);

  // Parsed NLP query (computed from committedQuery)
  const parsedQuery = useMemo<ParsedQuery | null>(() => {
    if (!committedQuery.trim()) return null;
    return parseQueryNLP(committedQuery);
  }, [committedQuery]);

  const didYouMean = parsedQuery?.wasCorrected ? parsedQuery : null;

  // Location filters — separate from search query, OR logic
  const [locationFilters, setLocationFilters] = useState<string[]>([]);

  // Legacy state (for Supabase query compat)
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [salaryFilter, setSalaryFilter] = useState("all");
  const [eduFilter] = useState("all");

  // Client-side filters (no new API call)
  const [jobTypeFilter, setJobTypeFilter] = useState("All");
  const [expFilter, setExpFilter] = useState("All");
  const [sectorFilter, setSectorFilter] = useState("All");
  const [clientSalaryFilter, setClientSalaryFilter] = useState("all");
  const [sortBy, setSortBy] = useState("Best Match");

  // Smart search summary (legacy, kept for intent bar fallback)
  const [parsedFilters, setParsedFilters] = useState<ParsedSearchQuery | null>(null);
  const [parsedSummary, setParsedSummary] = useState<string | null>(null);
  const [isParsingSearch] = useState(false);
  const [smartSearchDismissed] = useState(false);

  // Helper: parse locations from URL and query text
  const parseUrlLocations = useCallback((): string[] => {
    const urlParams = new URLSearchParams(window.location.search);
    const locParam = urlParams.get('location');
    const locsParam = urlParams.get('locations');
    const fromUrl: string[] = [];
    if (locParam) fromUrl.push(locParam);
    if (locsParam) locsParam.split(',').forEach(l => { if (l.trim()) fromUrl.push(l.trim()); });
    return fromUrl.map(normalizeLocation).filter((l): l is string => !!l);
  }, []);

  // Read URL params on mount
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const initialSearch = urlParams.get('search') || '';
    const urlLocations = parseUrlLocations();
    if (initialSearch) {
      const { cleanQuery, locations } = extractLocations(initialSearch);
      const mergedLocations = Array.from(new Set([...urlLocations, ...locations]));
      setQuery(initialSearch);
      setCommittedQuery(initialSearch);
      setSearchQuery(normaliseBmQuery(cleanQuery));
      setHasSearched(true);
      setDebouncedSearch(cleanQuery);
      setLocationFilters(mergedLocations);
      // Also set legacy parsed query intent for display
      const parsed = parseQueryNLP(initialSearch);
      if (parsed.locations.length > 0 && mergedLocations.length === 0) {
        setLocationFilters(parsed.locations);
      }
    } else if (urlLocations.length > 0) {
      setLocationFilters(urlLocations);
    }
  }, [parseUrlLocations]);

  // Data
  const [jobs, setJobs] = useState<JobCard[]>([]);
  const [total, setTotal] = useState(0);
  const [exactCount, setExactCount] = useState(0);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const [selectedJobDetail, setSelectedJobDetail] = useState<JobDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  // Apply state
  const [applied, setApplied] = useState<ApplicationStatus>({});
  const [applyJob, setApplyJob] = useState<JobCard | null>(null);

  // Saved jobs state
  const [saved, setSaved] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState<Set<string>>(new Set());

  // Mobile filters
  const [showMobileFilters, setShowMobileFilters] = useState(false);

  // Role check
  const [role, setRole] = useState<string | null>(null);
  useEffect(() => {
    if (!user) return;
    supabase.from("profiles").select("role").eq("id", user.id).maybeSingle()
      .then(({ data }) => setRole(data?.role ?? "job_seeker"));
  }, [user]);

  // Full personalization vector
  const [userVector, setUserVector] = useState<UserInterestVector>(EMPTY_VECTOR);
  const [personalChips, setPersonalChips] = useState<string[]>([]);

  useEffect(() => {
    if (!user) return;
    buildUserInterestVector(user.id).then(vec => {
      setUserVector(vec);
      setPersonalChips(buildPersonalisedChips(vec));
    }).catch(() => {});
  }, [user]);

  // NLP-scored jobs (client-side reranking) with personalisation boost
  const scoredJobs = useMemo(() => {
    const hasQuery = !!committedQuery.trim() && !!parsedQuery;

    const scored = jobs.map(j => {
      const queryScore = hasQuery ? scoreJob(j as any, parsedQuery!, committedQuery) : 0;
      const personBoost = personaliseJob(j as any, userVector);
      // When no query: rank purely by personalisation; when query: blend 70/30
      const combined = hasQuery
        ? queryScore + personBoost * 0.3
        : personBoost;
      return { job: j, score: combined, rawQuery: queryScore, personBoost, pct: 0 };
    });

    if (!hasQuery && !userVector.hasData) {
      return jobs.map(j => ({ job: j, score: null as number | null, pct: null as number | null, rawQuery: 0, personBoost: 0 }));
    }

    const maxScore = Math.max(...scored.map(s => s.score ?? 0), 1);
    const withPct = scored.map(s => ({
      ...s,
      pct: s.score > 0 ? scoreToPercent(s.score, maxScore) : null,
    }));
    // Sort
    let sorted = [...withPct];
    if (sortBy === "Best Match") sorted.sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
    else if (sortBy === "Most Recent") sorted.sort((a, b) => new Date(b.job.created_at ?? 0).getTime() - new Date(a.job.created_at ?? 0).getTime());
    else if (sortBy === "Highest Salary") sorted.sort((a, b) => (b.job.salary_max ?? 0) - (a.job.salary_max ?? 0));
    // Client-side filters
    return sorted.filter(({ job }) => {
      if (jobTypeFilter !== "All") {
        const desc = (job.job_description ?? "").toLowerCase();
        const t = job.job_title.toLowerCase();
        const kws: Record<string, string[]> = {
          Remote: ["remote", "wfh", "hybrid"], "Part-time": ["part time", "part-time"],
          Contract: ["contract"], Internship: ["intern", "internship"],
          "Full-time": ["permanent", "full time", "full-time"],
        };
        if (!kws[jobTypeFilter]?.some(k => desc.includes(k) || t.includes(k))) return false;
      }
      if (expFilter !== "All") {
        const desc = (job.job_description ?? "").toLowerCase();
        const t = job.job_title.toLowerCase();
        const kws: Record<string, string[]> = {
          "Fresh Graduate": ["fresh grad", "fresh graduate", "entry level"],
          Junior: ["junior"], Mid: ["mid", "intermediate"], Senior: ["senior", "lead"],
        };
        if (!kws[expFilter]?.some(k => desc.includes(k) || t.includes(k))) return false;
      }
      if (sectorFilter !== "All") {
        const txt = ((job.industry ?? "") + " " + (job.company_name ?? "") + " " + (job.occupation_name ?? "")).toLowerCase();
        const kws: Record<string, string[]> = {
          MNC: ["mnc", "multinational", "international"], GLC: ["glc", "petronas", "maybank", "tnb", "cimb"],
          SME: ["sme", "small"], Startup: ["startup", "fintech"], Government: ["government", "kerajaan"],
        };
        if (!kws[sectorFilter]?.some(k => txt.includes(k))) return false;
      }
      if (clientSalaryFilter !== "all") {
        const [minS, maxS] = clientSalaryFilter.split("-");
        const sMin = parseInt(minS), sMax = parseInt(maxS);
        const jMax = job.salary_max ?? 0;
        const jMin = job.salary_min ?? 0;
        if (jMax > 0 && jMax < sMin) return false;
        if (jMin > 0 && jMin > sMax) return false;
      }
      return true;
    }).slice(0, 50);
  }, [jobs, committedQuery, parsedQuery, sortBy, jobTypeFilter, expFilter, sectorFilter, clientSalaryFilter]);

  // Helpers: URL sync
  const updateSearchUrl = useCallback((rawQuery: string, locs: string[]) => {
    const params = new URLSearchParams();
    if (rawQuery.trim()) params.set('search', rawQuery.trim());
    if (locs.length > 0) params.set('locations', locs.join(','));
    const url = `${window.location.pathname}${params.toString() ? '?' + params.toString() : ''}`;
    window.history.replaceState({}, '', url);
  }, []);

  const jobMatchesLocation = useCallback((job: JobCard, locs: string[]) => {
    if (locs.length === 0) return true;
    const jobLoc = ((job.state ?? "") + " " + (job.city ?? "")).toLowerCase();
    return locs.some(loc => {
      const l = loc.toLowerCase();
      return jobLoc.includes(l) || l.includes(jobLoc.split(" ")[0] ?? "");
    });
  }, []);

  // Safe semantic search helper — never blocks keyword results
  const runSemanticSearch = useCallback(async (searchText: string, locs: string[]) => {
    try {
      if (!searchText || searchText.trim().length < 2) return [];
      const session = await supabase.auth.getSession();
      const token = session.data.session?.access_token;
      // Parse salary from query if present
      const salMatch = searchText.match(/\b(\d{4,6})\b/);
      const salaryMin = salMatch ? parseInt(salMatch[1]) * 0.8 : undefined;
      const salaryMax = salMatch ? parseInt(salMatch[1]) * 1.2 : undefined;
      const semanticRes = await fetch("/api/interview", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          action: "semantic_search",
          query: searchText,
          type: "vacancies",
          limit: 50,
          location_filters: locs.length > 0 ? locs : undefined,
          salary_min: salaryMin,
          salary_max: salaryMax,
        }),
      });
      if (!semanticRes.ok) {
        console.warn("Semantic search non-OK:", semanticRes.status);
        return [];
      }
      const semanticData = await semanticRes.json();
      if (!semanticData?.ok || !Array.isArray(semanticData.results)) return [];
      // Map results — filters already applied server-side, but double-check location
      const filtered = (semanticData.results as any[]).filter((match: any) => {
        const v = match.vacancy ?? match;
        const job: JobCard = {
          id: String(match.vacancy_id ?? v.id ?? match.id ?? ''),
          source: "poc",
          job_title: v.job_title ?? v.occupation_name ?? "Untitled Position",
          company_name: v.occupation_name ?? v.company_name ?? null,
          state: v.state ?? null,
          city: v.city ?? null,
          salary: v.salary ?? "Salary not provided",
          salary_min: typeof v.salary_min === "number" && !isNaN(v.salary_min) ? v.salary_min : null,
          salary_max: typeof v.salary_max === "number" && !isNaN(v.salary_max) ? v.salary_max : null,
          education_level: v.education_level ?? null,
          skills: v.skills ?? "",
          occupation_name: v.occupation_name ?? null,
          created_at: v.created_at ?? null,
          industry: v.industry ?? null,
          job_description: v.job_description ?? null,
          field_of_study: v.field_of_study ?? null,
          semanticScore: match.hybridScore ?? match.semanticScore ?? v.semanticScore ?? null,
        };
        return jobMatchesLocation(job, locs);
      });
      return filtered;
    } catch (e) {
      console.warn("Semantic search failed, using keyword fallback:", e);
      return [];
    }
  }, [jobMatchesLocation]);

  // Trigger search
  const handleSearch = useCallback(async (overrideQuery?: string) => {
    const q = overrideQuery ?? query;
    if (!q.trim()) return;
    const { cleanQuery, locations } = extractLocations(q.trim());
    const selectedLocations = Array.from(new Set(locations));
    saveRecentSearch(q.trim());
    setCommittedQuery(q.trim());
    setSearchQuery(normaliseBmQuery(cleanQuery));
    setHasSearched(true);
    setSemanticActive(true);
    setDebouncedSearch(cleanQuery);
    setLocationFilters(selectedLocations);
    updateSearchUrl(q.trim(), selectedLocations);

    // Run semantic search in background and merge scores into existing keyword results only.
    // Semantic AI must improve ranking, not add uncounted semantic-only jobs.
    try {
      const matches = await runSemanticSearch(cleanQuery, selectedLocations);
      if (matches.length > 0) {
        setJobs((prevJobs) => {
          const byId = new Map(prevJobs.map((j) => [String(j.id), j]));
          matches.forEach((match: any) => {
            const v = match.vacancy ?? match;
            const id = String(match.vacancy_id ?? v.id ?? match.id);
            if (!id || id === "undefined") return;
            const existing = byId.get(id);
            if (existing) {
              existing.semanticScore = v.semanticScore ?? match.semanticScore ?? existing.semanticScore;
            }
            // Do not add semantic-only jobs to keep exact DB count accurate
          });
          return Array.from(byId.values());
        });
      }
    } catch (e) {
      console.warn("Semantic search merge failed:", e);
    }
  }, [query, runSemanticSearch, updateSearchUrl]);

  // Reset page on filter change
  useEffect(() => {
    setPage(0);
    setJobs([]);
    setSelectedJobId(null);
    setSelectedJobDetail(null);
  }, [debouncedSearch, locationFilters, salaryFilter, eduFilter]);

  const fetchJobs = useCallback(async (pageNum: number, append = false) => {
    if (pageNum === 0) setLoading(true); else setLoadingMore(true);
    const from = pageNum * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;

    const [pocResult, employerResult] = await Promise.all([
      fetchPocVacancies(from, to),
      fetchEmployerJobs(from, to),
    ]);

    const pocJobs: JobCard[] = (pocResult.data ?? []).map((v: any) => ({
      id: v.id, source: "poc" as const,
      job_title: v.job_title ?? v.occupation_name ?? "Untitled Position",
      company_name: v.occupation_name ?? null,
      state: v.state ?? null, city: v.city ?? null,
      salary: v.salary ?? "Salary not provided",
      salary_min: typeof v.salary_min === "number" && !isNaN(v.salary_min) ? v.salary_min : null,
      salary_max: typeof v.salary_max === "number" && !isNaN(v.salary_max) ? v.salary_max : null,
      education_level: v.education_level ?? null,
      skills: v.skills ?? "", occupation_name: v.occupation_name ?? null,
      created_at: null, industry: null,
      job_description: v.job_description ?? null,
      field_of_study: v.field_of_study ?? null,
    }));

    const empJobs: JobCard[] = (employerResult.data ?? []).map((j: any) => ({
      id: j.id, source: "employer" as const,
      job_title: j.job_title, company_name: j.company_name,
      state: j.location ?? null, city: null,
      salary: null, salary_min: null, salary_max: null,
      education_level: null, skills: null, occupation_name: j.employer_type ?? null,
      created_at: j.created_at, industry: j.industry,
      job_description: j.description ?? null,
      field_of_study: null,
    }));

    let combined = [...pocJobs, ...empJobs];

    // Sort by recent
    combined = combined.sort((a, b) => {
      if (a.created_at && b.created_at) return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      if (a.created_at) return -1;
      if (b.created_at) return 1;
      return 0;
    });

    // Fetch exact count in parallel for accurate total
    try {
      const count = await fetchExactCount();
      setExactCount(count);
      setTotal(count);
    } catch (e) {
      console.warn("Exact count failed:", e);
      const pocCount = pocResult.count ?? 0;
      const empCount = employerResult.count ?? 0;
      setExactCount(pocCount + empCount);
      setTotal(pocCount + empCount);
    }

    if (append) setJobs((prev) => [...prev, ...combined]);
    else setJobs(combined);

    // Load applied statuses
    if (user && combined.length > 0) {
      const pocIds = combined.filter((j) => j.source === "poc").map((j) => j.id);
      const jobIds = combined.filter((j) => j.source === "employer").map((j) => j.id);
      const checks: Promise<void>[] = [];
      if (pocIds.length > 0) {
        checks.push(
          (async () => {
            const { data } = await supabase.from("applications").select("poc_vacancy_id").eq("user_id", user.id).in("poc_vacancy_id", pocIds);
            const applied: ApplicationStatus = {};
            (data ?? []).forEach((a: any) => { if (a.poc_vacancy_id) applied[`poc:${a.poc_vacancy_id}`] = "applied"; });
            setApplied((prev) => ({ ...prev, ...applied }));
          })()
        );
      }
      if (jobIds.length > 0) {
        checks.push(
          (async () => {
            const { data } = await supabase.from("applications").select("job_id").eq("user_id", user.id).in("job_id", jobIds);
            const applied: ApplicationStatus = {};
            (data ?? []).forEach((a: any) => { if (a.job_id) applied[`job:${a.job_id}`] = "applied"; });
            setApplied((prev) => ({ ...prev, ...applied }));
          })()
        );
      }
      await Promise.all(checks);
    }

    // Debug-safe logging in development
    if (process.env.NODE_ENV === "development") {
      console.debug({
        searchQuery,
        selectedLocations: locationFilters,
        exactCount: exactCount,
        keywordFetched: combined.length,
        semanticFetched: 0,
        finalDisplayed: combined.length,
      });
    }

    setLoading(false);
    setLoadingMore(false);
  }, [debouncedSearch, locationFilters, salaryFilter, eduFilter, user, searchQuery]);

  async function fetchExactCount(): Promise<number> {
    const [pocCount, empCount] = await Promise.all([
      countPocVacancies(),
      countEmployerJobs(),
    ]);
    return (pocCount ?? 0) + (empCount ?? 0);
  }

  async function countPocVacancies() {
    let q = (supabase as any)
      .from("poc_vacancies")
      .select("*", { count: "exact", head: true });
    if (searchQuery) {
      const expanded = expandKeywords(searchQuery);
      const titleClauses = expanded.map((k: string) => `job_title.ilike.%${k}%,occupation_name.ilike.%${k}%`).join(',');
      q = q.or(`${titleClauses},skills.ilike.%${searchQuery}%`);
    }
    if (locationFilters.length > 0) {
      const locClauses = locationFilters.flatMap((loc: string) => [
        `state.ilike.%${loc}%`,
        `city.ilike.%${loc}%`,
      ]).join(',');
      q = q.or(locClauses);
    }
    const { count } = await q;
    return count ?? 0;
  }

  async function countEmployerJobs() {
    let q = (supabase as any)
      .from("jobs")
      .select("*", { count: "exact", head: true })
      .eq("status", "open");
    if (searchQuery) {
      const expanded = expandKeywords(searchQuery);
      const titleClauses = expanded.map((k: string) => `job_title.ilike.%${k}%`).join(',');
      q = q.or(`${titleClauses},description.ilike.%${searchQuery}%`);
    }
    if (locationFilters.length > 0) {
      const locClauses = locationFilters.map((loc: string) => `location.ilike.%${loc}%`).join(',');
      q = q.or(locClauses);
    }
    const { count } = await q;
    return count ?? 0;
  }

  async function fetchPocVacancies(from: number, to: number) {
    let q = (supabase as any)
      .from("poc_vacancies")
      .select("id, job_title, occupation_name, state, city, salary, salary_min, salary_max, education_level, skills, job_description, field_of_study", { count: "exact" });

    if (searchQuery) {
      const expanded = expandKeywords(searchQuery);
      const titleClauses = expanded.map((k: string) => `job_title.ilike.%${k}%,occupation_name.ilike.%${k}%`).join(',');
      q = q.or(`${titleClauses},skills.ilike.%${searchQuery}%`);
    }
    if (locationFilters.length > 0) {
      const locClauses = locationFilters.flatMap((loc: string) => [
        `state.ilike.%${loc}%`,
        `city.ilike.%${loc}%`,
      ]).join(',');
      q = q.or(locClauses);
    }
    if (eduFilter && eduFilter !== "all") q = q.ilike("education_level", `%${eduFilter}%`);
    if (salaryFilter && salaryFilter !== "all") {
      const [minS, maxS] = salaryFilter.split("-");
      const minV = parseInt(minS), maxV = parseInt(maxS);
      q = q.gte("salary_max", minV).lte("salary_min", maxV);
    }
    q = q.range(from, to);
    return q;
  }

  async function fetchEmployerJobs(from: number, to: number) {
    let q = (supabase as any)
      .from("jobs")
      .select("id, job_title, company_name, employer_type, industry, location, created_at, description", { count: "exact" })
      .eq("status", "open");

    if (searchQuery) {
      const expanded = expandKeywords(searchQuery);
      const titleClauses = expanded.map((k: string) => `job_title.ilike.%${k}%`).join(',');
      q = q.or(`${titleClauses},description.ilike.%${searchQuery}%`);
    }
    if (locationFilters.length > 0) {
      const locClauses = locationFilters.map((loc: string) => `location.ilike.%${loc}%`).join(',');
      q = q.or(locClauses);
    }
    q = q.order("created_at", { ascending: false });
    q = q.range(from, to);
    return q;
  }

  useEffect(() => {
    void fetchJobs(0, false);
  }, [fetchJobs]);

  const loadMore = () => {
    const nextPage = page + 1;
    setPage(nextPage);
    void fetchJobs(nextPage, true);
  };

  const clearFilters = () => {
    setQuery(""); setCommittedQuery(""); setSearchQuery(""); setHasSearched(false);
    setSemanticActive(false);
    setDebouncedSearch(""); setLocationFilters([]); setSalaryFilter("all");
    setJobTypeFilter("All"); setExpFilter("All"); setSectorFilter("All");
    setClientSalaryFilter("all"); setSortBy("Best Match");
    setExactCount(0);
    updateSearchUrl("", []);
  };

  const hasFilters = !!(committedQuery || locationFilters.length > 0 || (salaryFilter !== "all"));
  const canApply = !authLoading && !!user && role === "job_seeker";

  // Load job detail when selected
  useEffect(() => {
    if (!selectedJobId) return;
    
    const job = jobs.find(j => j.id === selectedJobId);
    if (!job) return;

    setLoadingDetail(true);
    
    // For POC jobs, fetch full details
    if (job.source === "poc") {
      supabase.from("poc_vacancies")
        .select("job_description, field_of_study")
        .eq("id", selectedJobId)
        .single()
        .then(({ data }) => {
          setSelectedJobDetail({
            ...job,
            full_description: data?.job_description,
            all_skills: skillList(job.skills),
          });
          setLoadingDetail(false);
        })
        .catch(() => {
          setSelectedJobDetail({
            ...job,
            full_description: null,
            all_skills: skillList(job.skills),
          });
          setLoadingDetail(false);
        });
    } else {
      // For employer jobs, use the description we already have
      setSelectedJobDetail({
        ...job,
        full_description: job.job_description,
        all_skills: skillList(job.skills),
      });
      setLoadingDetail(false);
    }
  }, [selectedJobId, jobs]);

  const handleJobSelect = (jobId: string) => {
    setSelectedJobId(jobId);
    
    // On mobile, navigate to detail page
    if (window.innerWidth < 768) {
      void navigate({ to: "/jobs/$jobId", params: { jobId } });
    }
  };

  const handleApply = (job: JobCard) => {
    if (canApply) {
      setApplyJob(job);
    }
  };

  // Load saved jobs for current user
  useEffect(() => {
    if (!user) return;
    supabase.from("saved_jobs").select("job_id, poc_vacancy_id")
      .eq("user_id", user.id)
      .then(({ data, error }) => {
        if (error) return;
        const keys = new Set<string>();
        (data ?? []).forEach((row: any) => {
          if (row.job_id) keys.add(`job:${row.job_id}`);
          if (row.poc_vacancy_id) keys.add(`poc:${row.poc_vacancy_id}`);
        });
        setSaved(keys);
      });
  }, [user, jobs]);

  async function toggleSave(job: JobCard) {
    if (!user) {
      toast.error("Please sign in to save jobs");
      return;
    }
    const key = job.source === "poc" ? `poc:${job.id}` : `job:${job.id}`;
    const isSaved = saved.has(key);
    setSaving(prev => { const next = new Set(prev); next.add(key); return next; });

    if (isSaved) {
      const q = supabase.from("saved_jobs").delete().eq("user_id", user.id);
      const { error } = job.source === "poc"
        ? await q.eq("poc_vacancy_id", job.id)
        : await q.eq("job_id", job.id);
      if (error) {
        toast.error("Failed to remove saved job");
      } else {
        setSaved(prev => { const next = new Set(prev); next.delete(key); return next; });
      }
    } else {
      const row = { user_id: user.id, ...(job.source === "poc" ? { poc_vacancy_id: job.id } : { job_id: job.id }) };
      const { error } = await supabase.from("saved_jobs").insert(row);
      if (error) {
        toast.error("Failed to save job");
      } else {
        setSaved(prev => { const next = new Set(prev); next.add(key); return next; });
      }
    }
    setSaving(prev => { const next = new Set(prev); next.delete(key); return next; });
  }

  const selectedJobKey = selectedJobDetail ? 
    (selectedJobDetail.source === "poc" ? `poc:${selectedJobDetail.id}` : `job:${selectedJobDetail.id}`) : null;
  const isApplied = selectedJobKey ? applied[selectedJobKey] === "applied" : false;

  return (
    <>
    <div style={{ display: 'flex', minHeight: '100vh', flexDirection: 'column', background: 'var(--base)' }}>
      {/* NLP Smart Search Bar */}
      <SmartSearchBar
        value={query}
        onChange={setQuery}
        onSearch={handleSearch}
        jobs={jobs}
        total={exactCount || total}
        parsedQuery={parsedQuery}
        hasSearched={hasSearched}
        personalChips={personalChips}
        userVector={userVector}
        semanticActive={semanticActive}
        locationFilters={locationFilters}
      />

      {/* Did-you-mean banner */}
      {hasSearched && didYouMean && (
        <div style={{ background: "#EEF2FF", border: "1px solid #C7D2FE", borderRadius: 12, padding: "12px 16px", margin: "8px 16px 0", display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", fontSize: 13 }}>
          <Search style={{ width: 14, height: 14, color: "#6366F1", flexShrink: 0 }} />
          <span style={{ color: "#3730A3" }}>Showing results for <strong>&ldquo;{didYouMean.correctedQuery}&rdquo;</strong></span>
          <button
            onClick={() => { const q = didYouMean.originalQuery ?? ""; setQuery(q); handleSearch(q); }}
            style={{ color: "#6366F1", background: "none", border: "none", cursor: "pointer", textDecoration: "underline", fontSize: 13, padding: 0 }}
          >
            Search instead for &ldquo;{didYouMean.originalQuery}&rdquo;
          </button>
        </div>
      )}

      {/* Filter bar — only after first search */}
      {hasSearched && (
        <FilterSidebar
          jobTypeFilter={jobTypeFilter} setJobTypeFilter={setJobTypeFilter}
          expFilter={expFilter} setExpFilter={setExpFilter}
          sectorFilter={sectorFilter} setSectorFilter={setSectorFilter}
          salaryFilter={clientSalaryFilter} setSalaryFilter={setClientSalaryFilter}
          sortBy={sortBy} setSortBy={setSortBy}
          onClear={clearFilters}
        />
      )}

      {/* Main content — split panel */}
      <div className="flex-1 flex overflow-hidden" style={{ height: "calc(100vh - 200px)" }}>
        {/* Left panel — Job list (40%) */}
        <div className="w-full sm:w-[42%] min-w-0 flex flex-col" style={{ borderRight: '1px solid var(--line)', background: 'var(--surface)' }}>
          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '80px 0' }}>
                <Loader2 className="size-6 animate-spin" style={{ color: '#205295' }} />
              </div>
            ) : scoredJobs.length === 0 ? (
              <div style={{ padding: '32px 20px', textAlign: 'center' }}>
                <div style={{ width: 56, height: 56, borderRadius: 14, background: 'var(--base)', border: '1px solid var(--line)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}>
                  <Briefcase style={{ width: 24, height: 24, color: 'var(--muted)' }} />
                </div>
                <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--ink)', margin: '0 0 6px' }}>No exact matches for &ldquo;{committedQuery}&rdquo;</h3>
                {didYouMean ? (
                  <button
                    onClick={() => { const q = didYouMean.correctedQuery ?? ""; setQuery(q); handleSearch(q); }}
                    style={{ fontSize: 13, color: '#6366F1', fontWeight: 600, background: '#EEF2FF', border: '1px solid #C7D2FE', borderRadius: 10, padding: '6px 14px', cursor: 'pointer', marginBottom: 12 }}
                  >
                    🔍 Try &ldquo;{didYouMean.correctedQuery}&rdquo; instead
                  </button>
                ) : (
                  <p style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 12 }}>Try a different query or browse suggestions below.</p>
                )}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center', marginBottom: 16 }}>
                  {Object.keys(SYNONYMS).slice(0, 4).map(s => (
                    <button key={s} onClick={() => { setQuery(s); handleSearch(s); }}
                      style={{ fontSize: 12, fontWeight: 500, color: '#205295', background: 'rgba(32,82,149,0.06)', border: '1px solid var(--line)', borderRadius: 999, padding: '4px 12px', cursor: 'pointer', transition: 'all 0.15s' }}
                    >{s}</button>
                  ))}
                </div>
                <a href="/jobs" style={{ fontSize: 12, color: '#f36c21', fontWeight: 600 }}>Browse all 5,828 jobs →</a>
                {hasFilters && <div style={{ marginTop: 12 }}><button onClick={clearFilters} style={{ fontSize: 13, fontWeight: 600, color: '#205295', background: 'none', border: '1px solid var(--line)', borderRadius: 8, padding: '6px 14px', cursor: 'pointer' }}>{t("clearFilters")}</button></div>}
              </div>
            ) : (
              <div>
                <div style={{ padding: '8px 16px 4px', borderBottom: '1px solid var(--line)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: 11, fontWeight: 500, color: 'var(--muted)' }}>
                    {exactCount || total || scoredJobs.length} job{(exactCount || total || scoredJobs.length) !== 1 ? 's' : ''} found
                    {hasSearched ? ' (ranked by Semantic AI)' : userVector.hasData ? ' matched for you' : ''}
                  </span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    {hasSearched && (
                      <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 10, fontWeight: 700, color: '#205295', background: 'rgba(32,82,149,0.08)', borderRadius: 999, padding: '2px 8px' }}>
                        <Sparkles style={{ width: 9, height: 9 }} /> Semantic AI ranking active
                      </span>
                    )}
                    {userVector.hasData && !hasSearched && (
                      <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 10, fontWeight: 700, color: '#f36c21', background: 'rgba(243,108,33,0.1)', borderRadius: 999, padding: '2px 8px' }}>
                        <Brain style={{ width: 9, height: 9 }} /> Personalised
                      </span>
                    )}
                  </div>
                </div>
                {scoredJobs.map(({ job, pct }) => {
                  const jobKey = job.source === "poc" ? `poc:${job.id}` : `job:${job.id}`;
                  const isAppliedCard = applied[jobKey] === "applied";
                  const isSavedCard = saved.has(jobKey);
                  return (
                    <JobCard
                      key={jobKey}
                      job={job}
                      isSelected={selectedJobId === job.id}
                      onSelect={() => handleJobSelect(job.id)}
                      isApplied={isAppliedCard}
                      canApply={!!canApply}
                      onApply={() => handleApply(job)}
                      isSaved={isSavedCard}
                      onToggleSave={() => toggleSave(job)}
                      score={pct}
                      query={committedQuery}
                    />
                  );
                })}
                {jobs.length < total && scoredJobs.length >= 50 && (
                  <div style={{ padding: '12px', textAlign: 'center', borderTop: '1px solid var(--line)' }}>
                    <button onClick={loadMore} disabled={loadingMore} style={{ fontSize: 13, fontWeight: 600, color: '#205295', background: 'none', border: '1px solid var(--line)', borderRadius: 10, padding: '6px 16px', cursor: 'pointer', transition: 'all 0.15s' }}>
                      {loadingMore && <Loader2 className="size-4 animate-spin" />}
                      {t("loadMore")}
                    </button>
                    <p style={{ fontSize: 11, color: 'var(--muted)', marginTop: 6 }}>Showing top 50 of {total.toLocaleString()}</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right panel — Job detail (desktop only) */}
        <div className="hidden sm:flex flex-1 flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto">
            <JobDetail
              job={selectedJobDetail}
              isApplied={isApplied}
              canApply={!!canApply}
              onApply={() => selectedJobDetail && handleApply(selectedJobDetail)}
              loading={loadingDetail}
            />
          </div>
        </div>
      </div>

      <ApplyModal
        job={applyJob}
        onClose={() => setApplyJob(null)}
        onSuccess={(key) => setApplied((prev) => ({ ...prev, [key]: "applied" }))}
      />
    </div>
    <SiteFooter />
    </>
  );
}
