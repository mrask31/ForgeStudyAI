'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { BookOpen, ChevronRight, TrendingUp } from 'lucide-react';
import { useActiveProfile } from '@/contexts/ActiveProfileContext';
import { getCourses, type CourseInfo } from '@/app/actions/courses';

export default function CoursesPage() {
  const router = useRouter();
  const { activeProfileId } = useActiveProfile();
  const [courses, setCourses] = useState<CourseInfo[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!activeProfileId) return;
    setLoading(true);
    getCourses(activeProfileId)
      .then(setCourses)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [activeProfileId]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 md:p-8 max-w-4xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <BookOpen className="w-6 h-6 text-indigo-400" />
        <h1 className="text-2xl font-bold">My Courses</h1>
      </div>

      {loading ? (
        <div className="animate-pulse space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-20 bg-slate-900/60 rounded-xl" />
          ))}
        </div>
      ) : courses.length === 0 ? (
        <div className="text-center py-16">
          <BookOpen className="w-12 h-12 text-slate-600 mx-auto mb-4" />
          <p className="text-slate-400">No courses synced yet. Connect Canvas to see your courses here.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {courses.map(course => (
            <button
              key={course.courseId}
              onClick={() => router.push(`/courses/${encodeURIComponent(course.courseId)}`)}
              className="w-full bg-slate-900/60 border border-slate-800 rounded-xl p-4 hover:border-indigo-500/40 transition-colors text-left flex items-center gap-4"
            >
              <div className="w-12 h-12 bg-gradient-to-br from-indigo-500/20 to-purple-500/20 border border-indigo-500/30 rounded-lg flex items-center justify-center flex-shrink-0">
                <BookOpen className="w-5 h-5 text-indigo-400" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-medium text-slate-100 truncate">{course.courseName}</h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  {course.topicCount} topic{course.topicCount !== 1 ? 's' : ''}
                  {course.upcomingDue.length > 0 && (
                    <> &middot; {course.upcomingDue.length} upcoming</>
                  )}
                </p>
              </div>
              <div className="flex items-center gap-3 flex-shrink-0">
                <div className="flex items-center gap-1 text-xs">
                  <TrendingUp className="w-3.5 h-3.5 text-slate-400" />
                  <span className="text-slate-300">{course.avgMastery}%</span>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-600" />
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
