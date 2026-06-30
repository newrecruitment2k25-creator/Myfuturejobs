import { createFileRoute, useNavigate, useParams } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useRef, useState, useCallback } from "react";
import { toast } from "sonner";
import {
  Mic, MicOff, Video, VideoOff, SkipForward, StopCircle,
  Bot, Loader2, CheckCircle2, Clock, AlertTriangle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import {
  generateInterviewQuestion,
  submitInterviewAnswer,
  completeInterview,
  generateSpeech,
} from "@/lib/interview.functions";
import { generateTalkingAvatar } from "@/lib/did-avatar.functions";

export const Route = createFileRoute("/interview/$sessionId/room")({
  component: InterviewRoomPage,
  ssr: false,
  head: () => ({
    meta: [{ title: "Interview Room — MYFutureJobs" }],
  }),
});

type Phase = "loading" | "asking" | "listening" | "submitting" | "scoring" | "done";

function InterviewRoomPage() {
  const { sessionId } = useParams({ from: "/interview/$sessionId/room" });
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  const [session, setSession] = useState<any>(null);
  const [pageState, setPageState] = useState<"loading" | "ready" | "not_found">("loading");

  const genQuestion = useServerFn(generateInterviewQuestion);
  const submitAnswer = useServerFn(submitInterviewAnswer);
  const finishInterview = useServerFn(completeInterview);
  const tts = useServerFn(generateSpeech);
  const talkingAvatar = useServerFn(generateTalkingAvatar);

  // Session state
  const [phase, setPhase] = useState<Phase>("loading");
  const [questionNumber, setQuestionNumber] = useState(1);
  const [totalQuestions, setTotalQuestions] = useState(5);
  const [currentQuestion, setCurrentQuestion] = useState("");
  const [currentResponseId, setCurrentResponseId] = useState("");
  const [transcript, setTranscript] = useState("");
  const [interimTranscript, setInterimTranscript] = useState("");
  const [lastScore, setLastScore] = useState<number | null>(null);
  const [tabSwitches, setTabSwitches] = useState(0);
  const [elapsedQ, setElapsedQ] = useState(0);
  const [elapsedTotal, setElapsedTotal] = useState(0);
  const [micMuted, setMicMuted] = useState(false);
  const [camOff, setCamOff] = useState(false);
  const [textFallback, setTextFallback] = useState(false);
  const [textAnswer, setTextAnswer] = useState("");
  const [speechAvailable, setSpeechAvailable] = useState(true);
  const [avatarVideoUrl, setAvatarVideoUrl] = useState<string | null>(null);
  const [avatarLoading, setAvatarLoading] = useState(false);
  const [avatarReady, setAvatarReady] = useState(false);

  // Refs
  const videoRef = useRef<HTMLVideoElement>(null);
  const avatarVideoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recognitionRef = useRef<any>(null);
  const timerQRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timerTotalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const totalStartRef = useRef(Date.now());
  const qStartRef = useRef(Date.now());
  const voiceRef = useRef<"nova" | "onyx">("nova");

  // ── Load voice preference ────────────────────────────────────────────────────
  useEffect(() => {
    const stored = sessionStorage.getItem(`MYFutureJobs:interview:voice:${sessionId}`);
    if (stored === "nova" || stored === "onyx") voiceRef.current = stored;
  }, [sessionId]);

  // ── Webcam ───────────────────────────────────────────────────────────────────
  useEffect(() => {
    navigator.mediaDevices
      .getUserMedia({ video: true, audio: false })
      .then((stream) => {
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch(() => {});
        }
      })
      .catch(() => setCamOff(true));
    return () => {
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  // ── Total timer ──────────────────────────────────────────────────────────────
  useEffect(() => {
    timerTotalRef.current = setInterval(() => {
      setElapsedTotal(Math.floor((Date.now() - totalStartRef.current) / 1000));
    }, 1000);
    return () => { if (timerTotalRef.current) clearInterval(timerTotalRef.current); };
  }, []);

  // ── Proctoring: tab visibility ────────────────────────────────────────────────
  useEffect(() => {
    const handler = () => {
      if (document.hidden) {
        setTabSwitches((n) => n + 1);
        toast.warning("⚠️ Tab switch detected — this is logged.", { duration: 3000 });
      }
    };
    document.addEventListener("visibilitychange", handler);
    return () => document.removeEventListener("visibilitychange", handler);
  }, []);

  // ── Speech recognition setup ─────────────────────────────────────────────────
  useEffect(() => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) { setSpeechAvailable(false); setTextFallback(true); return; }
    const rec = new SR();
    rec.continuous = true;
    rec.interimResults = true;
    rec.lang = "en-MY";
    rec.onresult = (e: any) => {
      let final = "";
      let interim = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        if (e.results[i].isFinal) final += e.results[i][0].transcript + " ";
        else interim += e.results[i][0].transcript;
      }
      if (final) setTranscript((t) => t + final);
      setInterimTranscript(interim);
    };
    rec.onerror = () => { setTextFallback(true); };
    recognitionRef.current = rec;
  }, []);

  // ── Per-question timer ────────────────────────────────────────────────────────
  const startQTimer = useCallback(() => {
    qStartRef.current = Date.now();
    if (timerQRef.current) clearInterval(timerQRef.current);
    timerQRef.current = setInterval(() => {
      setElapsedQ(Math.floor((Date.now() - qStartRef.current) / 1000));
    }, 1000);
  }, []);

  // ── Play AI voice ─────────────────────────────────────────────────────────────
  const playAiVoice = useCallback(async (text: string) => {
    try {
      const { audio } = await tts({ data: { text, voice: voiceRef.current } });
      const bytes = Uint8Array.from(atob(audio), (c) => c.charCodeAt(0));
      const blob = new Blob([bytes], { type: "audio/mp3" });
      const url = URL.createObjectURL(blob);
      const player = new Audio(url);
      await player.play();
      await new Promise<void>((res) => { player.onended = () => res(); });
      URL.revokeObjectURL(url);
    } catch {
      // Voice failed silently — interview continues
    }
  }, [tts]);

  // ── Load next question ────────────────────────────────────────────────────────
  const loadQuestion = useCallback(async (qNum: number) => {
    setPhase("loading");
    setTranscript("");
    setInterimTranscript("");
    setTextAnswer("");
    setLastScore(null);
    setAvatarVideoUrl(null);
    setAvatarReady(false);
    if (timerQRef.current) clearInterval(timerQRef.current);
    try {
      const { question, response_id } = await genQuestion({
        data: { user_id: user!.id, session_id: sessionId, question_number: qNum },
      });
      setCurrentQuestion(question);
      setCurrentResponseId(response_id);
      // Get total from session (stored in sessionStorage by setup)
      const stored = sessionStorage.getItem(`MYFutureJobs:interview:total:${sessionId}`);
      if (stored) setTotalQuestions(Number(stored));
      setPhase("asking");
      setAvatarLoading(true);
      // Generate avatar video with the actual question text (fire and forget fallback)
      talkingAvatar({ data: { text: question, voice: "en-US-JennyNeural" } })
        .then(({ videoUrl }) => {
          if (videoUrl) {
            setAvatarVideoUrl(videoUrl);
            setAvatarLoading(false);
            // video onEnded will set phase to listening + start timer
          } else {
            setAvatarLoading(false);
            void playAiVoice(question).then(() => {
              setPhase("listening");
              startQTimer();
              if (!textFallback && recognitionRef.current) {
                try { recognitionRef.current.start(); } catch { /**/ }
              }
            });
          }
        })
        .catch(() => {
          setAvatarLoading(false);
          void playAiVoice(question).then(() => {
            setPhase("listening");
            startQTimer();
            if (!textFallback && recognitionRef.current) {
              try { recognitionRef.current.start(); } catch { /**/ }
            }
          });
        });
      return;
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to load question.");
      setPhase("asking");
    }
  }, [genQuestion, talkingAvatar, sessionId, playAiVoice, startQTimer, textFallback, user]);

  // ── Initial load (client-only, single effect) ─────────────────────────
  useEffect(() => {
    // Skip on server (typeof window check)
    if (typeof window === "undefined") return;
    // Wait for auth to finish loading
    if (authLoading) return;
    // Not logged in
    if (!user) { void navigate({ to: "/login" }); return; }

    console.log("[room] querying session:", sessionId, "user:", user.id);

    supabase
      .from("interview_sessions")
      .select("*")
      .eq("id", sessionId)
      .maybeSingle()
      .then(({ data, error }) => {
        console.log("[room] result:", { data, error });
        if (data) {
          setSession(data);
          setTotalQuestions(data.total_questions);
          const resumeFrom = data.current_question > 0 ? data.current_question + 1 : 1;
          const startAt = Math.min(resumeFrom, data.total_questions);
          setQuestionNumber(startAt);
          setPageState("ready");
          document.documentElement.requestFullscreen?.().catch(() => {});
          void loadQuestion(startAt);
        } else {
          setPageState("not_found");
        }
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, user, sessionId]);

  // ── Submit answer ─────────────────────────────────────────────────────────────
  const handleSubmitAnswer = useCallback(async () => {
    const answer = textFallback ? textAnswer : transcript;
    if (!answer.trim()) { toast.error("Please provide an answer before submitting."); return; }
    if (recognitionRef.current) { try { recognitionRef.current.stop(); } catch { /**/ } }
    if (timerQRef.current) clearInterval(timerQRef.current);
    setPhase("submitting");
    try {
      const { score } = await submitAnswer({
        data: { user_id: user!.id, response_id: currentResponseId, answer_text: answer.trim() },
      });
      setLastScore(score);
      setPhase("scoring");
      await new Promise((r) => setTimeout(r, 2000)); // show score briefly

      if (questionNumber < totalQuestions) {
        const next = questionNumber + 1;
        setQuestionNumber(next);
        await loadQuestion(next);
      } else {
        await handleComplete();
      }
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to submit answer.");
      setPhase("listening");
    }
  }, [textFallback, textAnswer, transcript, currentResponseId, questionNumber, totalQuestions, submitAnswer, loadQuestion]);

  // ── Complete interview ────────────────────────────────────────────────────────
  const handleComplete = useCallback(async () => {
    setPhase("done");
    if (timerQRef.current) clearInterval(timerQRef.current);
    if (timerTotalRef.current) clearInterval(timerTotalRef.current);
    streamRef.current?.getTracks().forEach((t) => t.stop());
    document.exitFullscreen?.().catch(() => {});
    try {
      await finishInterview({ data: { user_id: user!.id, session_id: sessionId } });
    } catch (e: any) {
      toast.error("Could not generate final summary: " + (e?.message ?? ""));
    }
    void navigate({ to: "/interview/$sessionId/summary", params: { sessionId } });
  }, [finishInterview, sessionId, navigate]);

  // ── Skip question ─────────────────────────────────────────────────────────────
  const handleSkip = useCallback(async () => {
    if (recognitionRef.current) { try { recognitionRef.current.stop(); } catch { /**/ } }
    if (questionNumber < totalQuestions) {
      const next = questionNumber + 1;
      setQuestionNumber(next);
      await loadQuestion(next);
    } else {
      await handleComplete();
    }
  }, [questionNumber, totalQuestions, loadQuestion, handleComplete]);

  // ── Toggle mic ────────────────────────────────────────────────────────────────
  const toggleMic = useCallback(() => {
    setMicMuted((m) => {
      const next = !m;
      if (recognitionRef.current) {
        try { next ? recognitionRef.current.stop() : recognitionRef.current.start(); } catch { /**/ }
      }
      return next;
    });
  }, []);

  const toggleCam = useCallback(() => {
    streamRef.current?.getVideoTracks().forEach((t) => { t.enabled = camOff; });
    setCamOff((c) => !c);
  }, [camOff]);

  const fmt = (s: number) => `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

  const scoreColor = (s: number) => s >= 70 ? "text-emerald-600" : s >= 50 ? "text-amber-500" : "text-red-500";
  const scoreBg = (s: number) => s >= 70 ? "bg-emerald-50 border-emerald-200" : s >= 50 ? "bg-amber-50 border-amber-200" : "bg-red-50 border-red-200";

  // RENDER GATES — in this exact order:
  if (pageState === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center gap-3" style={{ background: '#0d0e1a', color: '#fff' }}>
        <Loader2 className="size-8 animate-spin" style={{ color: '#F36C21' }} />
        <span className="text-sm font-bold">Loading interview...</span>
      </div>
    );
  }

  if (pageState === "not_found") {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4" style={{ background: '#0d0e1a', color: '#fff' }}>
        <AlertTriangle className="size-10" style={{ color: '#fbbf24' }} />
        <h1 className="text-2xl font-bold">Interview Session Not Found</h1>
        <p style={{ color: 'rgba(255,255,255,0.6)' }}>This interview session does not exist or has expired.</p>
        <Button variant="outline" onClick={() => void navigate({ to: "/dashboard" })}>Back to Dashboard</Button>
      </div>
    );
  }

  // pageState === "ready" — render the actual interview room UI below


  const voiceName = voiceRef.current === "nova" ? "Sarah" : "Adam";

  return (
    <div className="flex h-screen flex-col overflow-hidden" style={{ background: '#0d0e1a', color: '#fff' }}>
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-2.5" style={{ background: '#111827', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
        <div className="flex items-center gap-3">
          <button
            onClick={handleComplete}
            disabled={phase === "done"}
            className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition-colors disabled:opacity-40"
            style={{ background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)', color: '#f87171' }}
          >
            <StopCircle className="size-3.5" /> End Interview
          </button>
          <div className="flex items-center gap-1.5">
            <div className="size-2 rounded-full bg-red-500 animate-pulse" />
            <span className="text-xs font-bold" style={{ color: 'rgba(255,255,255,0.7)' }}>LIVE INTERVIEW</span>
            {session?.role_title && (
              <span className="text-xs font-bold" style={{ color: 'rgba(255,255,255,0.4)' }}>· {session.role_title}</span>
            )}
            <span className="text-xs font-bold" style={{ color: '#F36C21' }}>· Q {questionNumber}/{totalQuestions}</span>
            <span className="text-xs font-bold" style={{ color: 'rgba(255,255,255,0.4)' }}>· Q-time: {fmt(elapsedQ)}</span>
          </div>
        </div>
        <div className="flex items-center gap-4">
          {tabSwitches > 0 && (
            <span className="flex items-center gap-1 text-xs font-bold" style={{ color: '#fbbf24' }}>
              <AlertTriangle className="size-3" /> {tabSwitches} tab switch{tabSwitches > 1 ? "es" : ""}
            </span>
          )}
          <span className="flex items-center gap-1.5 text-xs font-bold" style={{ color: 'rgba(255,255,255,0.5)' }}>
            <Clock className="size-3" /> {fmt(elapsedTotal)}
          </span>
        </div>
      </div>

      {/* Main split — Left: AI Avatar (40%), Right: Candidate video (60%) */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left: AI Avatar panel */}
        <div className="flex w-[40%] flex-col" style={{ background: '#111827', borderRight: '1px solid rgba(255,255,255,0.08)' }}>
          {/* Avatar display */}
          <div className="relative flex-1 flex items-center justify-center" style={{ background: '#1a1a2e' }}>
            {avatarVideoUrl ? (
              <video
                ref={avatarVideoRef}
                key={avatarVideoUrl}
                src={avatarVideoUrl}
                autoPlay
                playsInline
                className="w-full h-full object-cover"
                onEnded={() => {
                  setAvatarReady(true);
                  setPhase("listening");
                  startQTimer();
                  if (!textFallback && recognitionRef.current) {
                    try { recognitionRef.current.start(); } catch { /**/ }
                  }
                }}
                onError={() => {
                  setAvatarReady(true);
                  setPhase("listening");
                  startQTimer();
                  if (!textFallback && recognitionRef.current) {
                    try { recognitionRef.current.start(); } catch { /**/ }
                  }
                }}
              />
            ) : (
              <div className="flex flex-col items-center justify-center gap-4">
                <div
                  className="flex size-32 items-center justify-center rounded-full"
                  style={{ border: '2px solid rgba(99,102,241,0.5)', background: 'rgba(99,102,241,0.1)' }}
                >
                  <Bot className="size-14" style={{ color: 'rgba(99,102,241,0.8)' }} />
                </div>
                <div className="text-center">
                  <p className="text-sm font-bold" style={{ color: 'rgba(255,255,255,0.8)' }}>{voiceName} — AI Interviewer</p>
                  {avatarLoading && (
                    <p className="text-xs mt-1 flex items-center gap-1 justify-center" style={{ color: 'rgba(255,255,255,0.4)' }}>
                      <Loader2 className="size-3 animate-spin" /> Preparing question…
                    </p>
                  )}
                  {phase === "listening" && (
                    <p className="text-xs mt-1" style={{ color: '#F36C21' }}>Listening…</p>
                  )}
                  {phase === "loading" && (
                    <p className="text-xs mt-1" style={{ color: 'rgba(255,255,255,0.4)' }}>Connecting…</p>
                  )}
                </div>
              </div>
            )}
            <div className="absolute bottom-3 left-0 right-0 text-center">
              <span className="text-xs font-bold" style={{ color: 'rgba(255,255,255,0.4)' }}>{voiceName} — AI Interviewer</span>
            </div>
          </div>

          {/* Progress bar */}
          <div className="h-1" style={{ background: 'rgba(255,255,255,0.08)' }}>
            <div
              className="h-full transition-all duration-500"
              style={{ width: `${((questionNumber - 1) / totalQuestions) * 100}%`, background: '#F36C21' }}
            />
          </div>

          {/* Question + transcript area */}
          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3" style={{ maxHeight: '45vh' }}>
            {phase === "loading" && (
              <div className="flex items-center gap-2" style={{ color: 'rgba(255,255,255,0.4)' }}>
                <Loader2 className="size-4 animate-spin" />
                <span className="text-sm">Preparing your first question…</span>
              </div>
            )}

            {phase !== "loading" && currentQuestion && (
              <div className="rounded-xl p-4" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}>
                <p className="text-xs font-bold mb-1" style={{ color: '#F36C21' }}>Question {questionNumber}</p>
                <p className="text-sm leading-relaxed" style={{ color: 'rgba(255,255,255,0.9)' }}>{currentQuestion}</p>
              </div>
            )}

            {phase === "scoring" && lastScore !== null && (
              <div className="rounded-xl p-3" style={{ background: lastScore >= 70 ? 'rgba(22,163,74,0.15)' : lastScore >= 50 ? 'rgba(217,119,6,0.15)' : 'rgba(220,38,38,0.15)', border: '1px solid rgba(255,255,255,0.1)' }}>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="size-4" style={{ color: lastScore >= 70 ? '#4ade80' : lastScore >= 50 ? '#fbbf24' : '#f87171' }} />
                  <span className="text-base font-extrabold" style={{ color: lastScore >= 70 ? '#4ade80' : lastScore >= 50 ? '#fbbf24' : '#f87171' }}>{lastScore}/100</span>
                  <span className="text-xs" style={{ color: 'rgba(255,255,255,0.5)' }}>Answer scored</span>
                </div>
              </div>
            )}

            {(phase === "listening" || phase === "submitting") && (
              <div className="rounded-xl p-4" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                <p className="text-xs font-bold mb-2 flex items-center gap-1.5" style={{ color: 'rgba(255,255,255,0.4)' }}>
                  {!micMuted && <span className="size-2 rounded-full bg-red-500 animate-pulse inline-block" />}
                  {textFallback ? "Type your answer below" : "Your answer will appear here as you speak — or type"}
                </p>
                {textFallback ? (
                  <textarea
                    className="w-full min-h-[80px] text-sm outline-none resize-none"
                    style={{ background: 'transparent', color: 'rgba(255,255,255,0.85)', caretColor: '#F36C21' }}
                    placeholder="Type your answer here…"
                    value={textAnswer}
                    onChange={(e) => setTextAnswer(e.target.value)}
                  />
                ) : (
                  <p className="text-sm min-h-[50px]" style={{ color: 'rgba(255,255,255,0.8)' }}>
                    {transcript}
                    <span style={{ color: 'rgba(255,255,255,0.4)' }}>{interimTranscript}</span>
                    {!transcript && !interimTranscript && (
                      <span style={{ color: 'rgba(255,255,255,0.25)' }}>Listening… speak clearly</span>
                    )}
                  </p>
                )}
              </div>
            )}

            {phase === "submitting" && (
              <div className="flex items-center gap-2" style={{ color: 'rgba(255,255,255,0.4)' }}>
                <Loader2 className="size-4 animate-spin" />
                <span className="text-sm">Scoring your answer…</span>
              </div>
            )}

            {phase === "done" && (
              <div className="flex items-center gap-2" style={{ color: 'rgba(255,255,255,0.4)' }}>
                <Loader2 className="size-4 animate-spin" />
                <span className="text-sm">Generating your assessment…</span>
              </div>
            )}
          </div>

          {/* Controls + Submit */}
          <div className="px-4 py-3 space-y-2" style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }}>
            <div className="flex items-center gap-2">
              <ControlBtn icon={micMuted ? MicOff : Mic} label={micMuted ? "Unmute Mic" : "Mute Mic"} onClick={toggleMic} active={micMuted} />
              <ControlBtn icon={camOff ? VideoOff : Video} label={camOff ? "Cam On" : "Camera"} onClick={toggleCam} active={camOff} />
              <ControlBtn icon={SkipForward} label="Skip" onClick={handleSkip} disabled={phase === "loading" || phase === "submitting" || phase === "done"} />
            </div>
            {phase === "listening" && (!avatarVideoUrl || avatarReady) && (
              <button
                className="w-full rounded-full py-2.5 text-sm font-extrabold transition-all disabled:opacity-40"
                style={{ background: '#F36C21', color: '#fff', border: 'none' }}
                onClick={handleSubmitAnswer}
                disabled={!textFallback ? !transcript.trim() : !textAnswer.trim()}
              >
                Submit Answer →
              </button>
            )}
          </div>
        </div>

        {/* Right: Candidate video (60%) */}
        <div className="relative flex w-[60%] items-center justify-center" style={{ background: '#0d0e1a' }}>
          {!camOff ? (
            <video
              ref={videoRef}
              autoPlay
              muted
              playsInline
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex flex-col items-center gap-3" style={{ color: 'rgba(255,255,255,0.3)' }}>
              <VideoOff className="size-16" />
              <span className="text-sm font-bold">Camera off</span>
            </div>
          )}
          <div className="absolute bottom-4 left-4 rounded-lg px-3 py-1.5 text-sm font-bold" style={{ background: 'rgba(0,0,0,0.6)' }}>You</div>
          <div className="absolute top-4 right-4 rounded-lg px-3 py-1.5 text-sm font-mono font-bold" style={{ background: 'rgba(0,0,0,0.6)' }}>{fmt(elapsedQ)}</div>
        </div>
      </div>
    </div>
  );
}

function ControlBtn({
  icon: Icon, label, onClick, active = false, disabled = false,
}: {
  icon: React.ElementType; label: string; onClick: () => void; active?: boolean; disabled?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-bold transition-colors disabled:opacity-40"
      style={active
        ? { background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)', color: '#f87171' }
        : { background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.7)' }
      }
    >
      <Icon className="size-4" />
      {label}
    </button>
  );
}
