export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      analyses: {
        Row: {
          company_type: string
          created_at: string
          email: string | null
          experience_level: string
          full_results: Json
          id: string
          industry: string
          language_preference: string
          overall_score: number
          user_id: string | null
        }
        Insert: {
          company_type: string
          created_at?: string
          email?: string | null
          experience_level: string
          full_results: Json
          id?: string
          industry: string
          language_preference: string
          overall_score: number
          user_id?: string | null
        }
        Update: {
          company_type?: string
          created_at?: string
          email?: string | null
          experience_level?: string
          full_results?: Json
          id?: string
          industry?: string
          language_preference?: string
          overall_score?: number
          user_id?: string | null
        }
        Relationships: []
      }
      applications: {
        Row: {
          cover_letter: string | null
          created_at: string
          employer_notes: string | null
          id: string
          job_id: string | null
          poc_vacancy_id: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          cover_letter?: string | null
          created_at?: string
          employer_notes?: string | null
          id?: string
          job_id?: string | null
          poc_vacancy_id?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          cover_letter?: string | null
          created_at?: string
          employer_notes?: string | null
          id?: string
          job_id?: string | null
          poc_vacancy_id?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "applications_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      candidate_matches: {
        Row: {
          analysis_id: string | null
          breakdown: Json
          candidate_id: string
          created_at: string
          explanation: string | null
          id: string
          job_id: string
          match_score: number
          model_used: string | null
          shortlisted: boolean
        }
        Insert: {
          analysis_id?: string | null
          breakdown?: Json
          candidate_id: string
          created_at?: string
          explanation?: string | null
          id?: string
          job_id: string
          match_score: number
          model_used?: string | null
          shortlisted?: boolean
        }
        Update: {
          analysis_id?: string | null
          breakdown?: Json
          candidate_id?: string
          created_at?: string
          explanation?: string | null
          id?: string
          job_id?: string
          match_score?: number
          model_used?: string | null
          shortlisted?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "candidate_matches_analysis_id_fkey"
            columns: ["analysis_id"]
            isOneToOne: false
            referencedRelation: "analyses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "candidate_matches_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      career_pathways: {
        Row: {
          action_plan: Json
          analysis_id: string | null
          bridge_role: Json | null
          created_at: string
          current_profile: Json
          id: string
          model_used: string | null
          skills_gap: Json
          target_role: Json
          timeline: string | null
          user_id: string
        }
        Insert: {
          action_plan?: Json
          analysis_id?: string | null
          bridge_role?: Json | null
          created_at?: string
          current_profile?: Json
          id?: string
          model_used?: string | null
          skills_gap?: Json
          target_role?: Json
          timeline?: string | null
          user_id: string
        }
        Update: {
          action_plan?: Json
          analysis_id?: string | null
          bridge_role?: Json | null
          created_at?: string
          current_profile?: Json
          id?: string
          model_used?: string | null
          skills_gap?: Json
          target_role?: Json
          timeline?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "career_pathways_analysis_id_fkey"
            columns: ["analysis_id"]
            isOneToOne: false
            referencedRelation: "analyses"
            referencedColumns: ["id"]
          },
        ]
      }
      caseworker_assignments: {
        Row: {
          candidate_id: string
          caseworker_id: string
          created_at: string
          id: string
          notes: string | null
          priority: number | null
          risk_level: string | null
          status: string
          updated_at: string
        }
        Insert: {
          candidate_id: string
          caseworker_id: string
          created_at?: string
          id?: string
          notes?: string | null
          priority?: number | null
          risk_level?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          candidate_id?: string
          caseworker_id?: string
          created_at?: string
          id?: string
          notes?: string | null
          priority?: number | null
          risk_level?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      employability_scores: {
        Row: {
          analysis_id: string | null
          breakdown: Json
          created_at: string
          explanation: string | null
          id: string
          model_used: string | null
          overall_score: number
          recommendations: Json
          user_id: string
        }
        Insert: {
          analysis_id?: string | null
          breakdown?: Json
          created_at?: string
          explanation?: string | null
          id?: string
          model_used?: string | null
          overall_score: number
          recommendations?: Json
          user_id: string
        }
        Update: {
          analysis_id?: string | null
          breakdown?: Json
          created_at?: string
          explanation?: string | null
          id?: string
          model_used?: string | null
          overall_score?: number
          recommendations?: Json
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "employability_scores_analysis_id_fkey"
            columns: ["analysis_id"]
            isOneToOne: false
            referencedRelation: "analyses"
            referencedColumns: ["id"]
          },
        ]
      }
      interventions: {
        Row: {
          assignment_id: string
          candidate_id: string
          caseworker_id: string
          completed_at: string | null
          created_at: string
          description: string | null
          id: string
          outcome: string | null
          priority: string | null
          status: string
          title: string
          type: string
        }
        Insert: {
          assignment_id: string
          candidate_id: string
          caseworker_id: string
          completed_at?: string | null
          created_at?: string
          description?: string | null
          id?: string
          outcome?: string | null
          priority?: string | null
          status?: string
          title: string
          type: string
        }
        Update: {
          assignment_id?: string
          candidate_id?: string
          caseworker_id?: string
          completed_at?: string | null
          created_at?: string
          description?: string | null
          id?: string
          outcome?: string | null
          priority?: string | null
          status?: string
          title?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "interventions_assignment_id_fkey"
            columns: ["assignment_id"]
            isOneToOne: false
            referencedRelation: "caseworker_assignments"
            referencedColumns: ["id"]
          },
        ]
      }
      interview_invitations: {
        Row: {
          ai_summary: Json | null
          candidate_id: string
          completed_at: string | null
          created_at: string
          deadline: string | null
          id: string
          message: string | null
          overall_score: number | null
          started_at: string | null
          status: string
          template_id: string
        }
        Insert: {
          ai_summary?: Json | null
          candidate_id: string
          completed_at?: string | null
          created_at?: string
          deadline?: string | null
          id?: string
          message?: string | null
          overall_score?: number | null
          started_at?: string | null
          status?: string
          template_id: string
        }
        Update: {
          ai_summary?: Json | null
          candidate_id?: string
          completed_at?: string | null
          created_at?: string
          deadline?: string | null
          id?: string
          message?: string | null
          overall_score?: number | null
          started_at?: string | null
          status?: string
          template_id?: string
        }
        Relationships: []
      }
      interview_template_questions: {
        Row: {
          created_at: string
          id: string
          question_number: number
          question_text: string
          question_type: string | null
          scoring_criteria: string | null
          template_id: string
          time_limit_seconds: number | null
        }
        Insert: {
          created_at?: string
          id?: string
          question_number: number
          question_text: string
          question_type?: string | null
          scoring_criteria?: string | null
          template_id: string
          time_limit_seconds?: number | null
        }
        Update: {
          created_at?: string
          id?: string
          question_number?: number
          question_text?: string
          question_type?: string | null
          scoring_criteria?: string | null
          template_id?: string
          time_limit_seconds?: number | null
        }
        Relationships: []
      }
      interview_templates: {
        Row: {
          company_name: string | null
          created_at: string
          employer_id: string
          experience_level: string | null
          id: string
          industry: string | null
          instructions: string | null
          interview_type: string
          job_id: string | null
          role_title: string
          time_limit_minutes: number | null
          title: string
        }
        Insert: {
          company_name?: string | null
          created_at?: string
          employer_id: string
          experience_level?: string | null
          id?: string
          industry?: string | null
          instructions?: string | null
          interview_type?: string
          job_id?: string | null
          role_title: string
          time_limit_minutes?: number | null
          title: string
        }
        Update: {
          company_name?: string | null
          created_at?: string
          employer_id?: string
          experience_level?: string | null
          id?: string
          industry?: string | null
          instructions?: string | null
          interview_type?: string
          job_id?: string | null
          role_title?: string
          time_limit_minutes?: number | null
          title?: string
        }
        Relationships: []
      }
      invitation_responses: {
        Row: {
          answer_text: string | null
          created_at: string
          feedback: Json | null
          id: string
          invitation_id: string
          question_id: string
          question_number: number
          score: number | null
        }
        Insert: {
          answer_text?: string | null
          created_at?: string
          feedback?: Json | null
          id?: string
          invitation_id: string
          question_id: string
          question_number: number
          score?: number | null
        }
        Update: {
          answer_text?: string | null
          created_at?: string
          feedback?: Json | null
          id?: string
          invitation_id?: string
          question_id?: string
          question_number?: number
          score?: number | null
        }
        Relationships: []
      }
      interview_responses: {
        Row: {
          answer_text: string | null
          created_at: string
          feedback: Json | null
          id: string
          model_used: string | null
          question_number: number
          question_text: string
          score: number | null
          session_id: string
        }
        Insert: {
          answer_text?: string | null
          created_at?: string
          feedback?: Json | null
          id?: string
          model_used?: string | null
          question_number: number
          question_text: string
          score?: number | null
          session_id: string
        }
        Update: {
          answer_text?: string | null
          created_at?: string
          feedback?: Json | null
          id?: string
          model_used?: string | null
          question_number?: number
          question_text?: string
          score?: number | null
          session_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "interview_responses_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "interview_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      interview_sessions: {
        Row: {
          ai_summary: Json | null
          analysis_id: string | null
          company_type: string | null
          created_at: string
          current_question: number
          experience_level: string | null
          id: string
          industry: string | null
          interview_type: string
          job_id: string | null
          model_used: string | null
          overall_score: number | null
          role_title: string
          status: string
          total_questions: number
          updated_at: string
          user_id: string
        }
        Insert: {
          ai_summary?: Json | null
          analysis_id?: string | null
          company_type?: string | null
          created_at?: string
          current_question?: number
          experience_level?: string | null
          id?: string
          industry?: string | null
          interview_type?: string
          job_id?: string | null
          model_used?: string | null
          overall_score?: number | null
          role_title: string
          status?: string
          total_questions?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          ai_summary?: Json | null
          analysis_id?: string | null
          company_type?: string | null
          created_at?: string
          current_question?: number
          experience_level?: string | null
          id?: string
          industry?: string | null
          interview_type?: string
          job_id?: string | null
          model_used?: string | null
          overall_score?: number | null
          role_title?: string
          status?: string
          total_questions?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "interview_sessions_analysis_id_fkey"
            columns: ["analysis_id"]
            isOneToOne: false
            referencedRelation: "analyses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "interview_sessions_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      jobs: {
        Row: {
          company_name: string
          created_at: string
          description: string
          employer_id: string
          employer_type: string
          id: string
          industry: string
          job_title: string
          location: string
          requirements: string
          status: string
        }
        Insert: {
          company_name: string
          created_at?: string
          description: string
          employer_id: string
          employer_type: string
          id?: string
          industry: string
          job_title: string
          location: string
          requirements: string
          status?: string
        }
        Update: {
          company_name?: string
          created_at?: string
          description?: string
          employer_id?: string
          employer_type?: string
          id?: string
          industry?: string
          job_title?: string
          location?: string
          requirements?: string
          status?: string
        }
        Relationships: []
      }
      placements: {
        Row: {
          application_id: string | null
          candidate_id: string
          caseworker_id: string | null
          created_at: string
          employer_id: string | null
          id: string
          job_id: string | null
          notes: string | null
          placement_date: string | null
          retention_check_date: string | null
          salary_achieved: number | null
          status: string
          updated_at: string
        }
        Insert: {
          application_id?: string | null
          candidate_id: string
          caseworker_id?: string | null
          created_at?: string
          employer_id?: string | null
          id?: string
          job_id?: string | null
          notes?: string | null
          placement_date?: string | null
          retention_check_date?: string | null
          salary_achieved?: number | null
          status?: string
          updated_at?: string
        }
        Update: {
          application_id?: string | null
          candidate_id?: string
          caseworker_id?: string | null
          created_at?: string
          employer_id?: string | null
          id?: string
          job_id?: string | null
          notes?: string | null
          placement_date?: string | null
          retention_check_date?: string | null
          salary_achieved?: number | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "placements_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "applications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "placements_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          id: string
          role: string
          updated_at: string
          visible_to_employers: boolean
        }
        Insert: {
          created_at?: string
          id: string
          role?: string
          updated_at?: string
          visible_to_employers?: boolean
        }
        Update: {
          created_at?: string
          id?: string
          role?: string
          updated_at?: string
          visible_to_employers?: boolean
        }
        Relationships: []
      }
      salary_estimates: {
        Row: {
          analysis_id: string | null
          created_at: string
          estimated_salary: Json
          growth_projection: Json
          id: string
          market_comparison: Json | null
          model_used: string | null
          salary_gap: string | null
          user_id: string
        }
        Insert: {
          analysis_id?: string | null
          created_at?: string
          estimated_salary?: Json
          growth_projection?: Json
          id?: string
          market_comparison?: Json | null
          model_used?: string | null
          salary_gap?: string | null
          user_id: string
        }
        Update: {
          analysis_id?: string | null
          created_at?: string
          estimated_salary?: Json
          growth_projection?: Json
          id?: string
          market_comparison?: Json | null
          model_used?: string | null
          salary_gap?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "salary_estimates_analysis_id_fkey"
            columns: ["analysis_id"]
            isOneToOne: false
            referencedRelation: "analyses"
            referencedColumns: ["id"]
          },
        ]
      }
      skills_passports: {
        Row: {
          analysis_id: string | null
          created_at: string
          id: string
          market_readiness_score: number | null
          missing_skills: Json
          model_used: string | null
          summary: string | null
          technical_skills: Json
          transferable_skills: Json
          user_id: string
        }
        Insert: {
          analysis_id?: string | null
          created_at?: string
          id?: string
          market_readiness_score?: number | null
          missing_skills?: Json
          model_used?: string | null
          summary?: string | null
          technical_skills?: Json
          transferable_skills?: Json
          user_id: string
        }
        Update: {
          analysis_id?: string | null
          created_at?: string
          id?: string
          market_readiness_score?: number | null
          missing_skills?: Json
          model_used?: string | null
          summary?: string | null
          technical_skills?: Json
          transferable_skills?: Json
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "skills_passports_analysis_id_fkey"
            columns: ["analysis_id"]
            isOneToOne: false
            referencedRelation: "analyses"
            referencedColumns: ["id"]
          },
        ]
      }
      training_plans: {
        Row: {
          analysis_id: string | null
          certifications: Json
          created_at: string
          id: string
          learning_path: Json
          model_used: string | null
          readiness_projection: Json | null
          skills_development: Json
          user_id: string
        }
        Insert: {
          analysis_id?: string | null
          certifications?: Json
          created_at?: string
          id?: string
          learning_path?: Json
          model_used?: string | null
          readiness_projection?: Json | null
          skills_development?: Json
          user_id: string
        }
        Update: {
          analysis_id?: string | null
          certifications?: Json
          created_at?: string
          id?: string
          learning_path?: Json
          model_used?: string | null
          readiness_projection?: Json | null
          skills_development?: Json
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "training_plans_analysis_id_fkey"
            columns: ["analysis_id"]
            isOneToOne: false
            referencedRelation: "analyses"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
