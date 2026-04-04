import { ImageResponse } from 'next/og'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'edge'

/**
 * GET /api/share/[profileId]
 * Generates a shareable mastery card as a PNG image.
 * Spotify Wrapped aesthetic — dark background, clean typography.
 */
export async function GET(req: Request, { params }: { params: { profileId: string } }) {
  const { profileId } = params

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceRoleKey) {
    return new Response('Server error', { status: 500 })
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  })

  // Fetch student profile
  const { data: profile } = await supabase
    .from('student_profiles')
    .select('display_name, grade_band, grade')
    .eq('id', profileId)
    .single()

  // Fetch mastery scores
  const { data: scores } = await supabase
    .from('mastery_scores')
    .select('score, student_classes!inner(name)')
    .eq('profile_id', profileId)
    .order('score', { ascending: false })
    .limit(3)

  // Fetch streak
  const { data: streakProfile } = await supabase
    .from('student_profiles')
    .select('current_streak_days')
    .eq('id', profileId)
    .single()

  const name = profile?.display_name?.split(' ')[0] || 'Student'
  const gradeLabel = profile?.grade ? `Grade ${profile.grade}` : profile?.grade_band === 'high' ? 'High School' : 'Middle School'
  const topSubject = scores?.[0] ? {
    name: (scores[0] as any).student_classes?.name || 'Subject',
    score: scores[0].score,
  } : null
  const streak = streakProfile?.current_streak_days || 0

  return new ImageResponse(
    (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          width: '600px',
          height: '400px',
          background: 'linear-gradient(135deg, #08080F 0%, #1a1a2e 50%, #16213e 100%)',
          padding: '48px',
          fontFamily: 'system-ui, sans-serif',
        }}
      >
        {/* Top: Name and grade */}
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ fontSize: '36px', fontWeight: 'bold', color: '#ffffff', marginBottom: '4px' }}>
            {name}
          </div>
          <div style={{ fontSize: '16px', color: '#94a3b8' }}>
            {gradeLabel}
          </div>
        </div>

        {/* Middle: Top subject + streak */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {topSubject && (
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '12px' }}>
              <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#818cf8' }}>
                {topSubject.name}
              </div>
              <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#6366f1' }}>
                {topSubject.score}/100
              </div>
            </div>
          )}
          {streak > 0 && (
            <div style={{ fontSize: '20px', color: '#fbbf24' }}>
              🔥 {streak} day streak
            </div>
          )}
        </div>

        {/* Bottom: Branding */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#818cf8' }} />
          <div style={{ fontSize: '14px', color: '#64748b', fontWeight: '600' }}>
            forgestudyai.com
          </div>
        </div>
      </div>
    ),
    {
      width: 600,
      height: 400,
    }
  )
}
