'use client'

import { useState, useEffect } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import ClassWithMaterials from '@/components/classes/ClassWithMaterials'
import ClassForm from '@/components/classes/ClassForm'
import { StudentClass } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Plus, BookOpen, GraduationCap } from 'lucide-react'
import { listClasses } from '@/lib/api/classes'

export default function ClassesPage() {
  const [userId, setUserId] = useState<string | null>(null)
  const [classes, setClasses] = useState<StudentClass[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingClass, setEditingClass] = useState<StudentClass | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)

  useEffect(() => {
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        setUserId(user.id)
        loadClasses(user.id)
      } else {
        setLoading(false)
      }
    })
  }, [refreshKey])

  const loadClasses = async (uid: string) => {
    setLoading(true)
    try {
      const classList = await listClasses(uid)
      setClasses(classList)
    } catch (error) {
      console.error('Failed to load classes:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleAddClass = () => {
    setEditingClass(null)
    setShowForm(true)
  }

  const handleEditClass = (classItem: StudentClass) => {
    setEditingClass(classItem)
    setShowForm(true)
  }

  const handleFormSuccess = () => {
    setShowForm(false)
    setEditingClass(null)
    setRefreshKey((k) => k + 1)
  }

  const handleFormCancel = () => {
    setShowForm(false)
    setEditingClass(null)
  }

  const handleRefresh = () => {
    if (userId) {
      loadClasses(userId)
    }
  }

  return (
    <div className="h-full overflow-y-auto bg-gradient-to-br from-slate-50 via-indigo-50/20 to-slate-50 p-4 sm:p-6 md:p-8 pt-safe-t">
      <div className="max-w-7xl mx-auto">
        {/* Header - Enhanced with consistent design */}
        <div className="mb-6 sm:mb-8">
          <div className="flex items-start justify-between mb-3 sm:mb-4 flex-wrap gap-3 sm:gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2.5 sm:gap-3 mb-2 sm:mb-3">
                <div className="p-2 sm:p-2.5 bg-gradient-to-br from-emerald-500 to-green-600 rounded-xl shadow-lg shadow-emerald-500/20 flex-shrink-0">
                  <GraduationCap className="w-5 h-5 sm:w-6 sm:h-6 md:w-7 md:h-7 text-white" />
                </div>
                <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold bg-gradient-to-r from-slate-900 via-indigo-900 to-slate-900 bg-clip-text text-transparent">
                  My Learning Map
                </h1>
              </div>
              <p className="text-sm sm:text-base text-slate-600 ml-11 sm:ml-14 max-w-2xl leading-relaxed">
                Choose a class to open its study map, see what to do first, and start a focused session.
              </p>
              <div className="ml-11 sm:ml-14 mt-3 sm:mt-4 max-w-2xl rounded-xl border border-emerald-100 bg-emerald-50/60 px-4 py-3 text-sm text-emerald-900">
                <p className="font-semibold mb-2">What you can do here</p>
                <ul className="list-disc pl-5 space-y-1">
                  <li>Create a class to get a study map and start-here path.</li>
                  <li>Open a class to launch a focused study session.</li>
                  <li>See what to do next before you dive in.</li>
                </ul>
              </div>
            </div>
            {!showForm && (
              <Button 
                onClick={handleAddClass} 
                className="bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 text-white shadow-md shadow-emerald-500/30 hover:shadow-lg hover:shadow-emerald-500/40 transition-all duration-200 transform hover:scale-105 active:scale-95 mt-2 sm:mt-0 flex-shrink-0"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Class
              </Button>
            )}
          </div>
        </div>

        {/* Form or List */}
        {showForm ? (
          <div className="bg-white/80 backdrop-blur-sm border border-slate-200/60 rounded-2xl shadow-lg shadow-slate-200/50 p-8">
            <h2 className="text-2xl font-bold text-slate-900 mb-6">
              {editingClass ? 'Edit Class' : 'Add New Class'}
            </h2>
            <ClassForm
              classItem={editingClass}
              onSuccess={handleFormSuccess}
              onCancel={handleFormCancel}
            />
          </div>
        ) : loading ? (
          <div className="text-center py-16">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-50 to-green-100 mb-4">
              <GraduationCap className="w-8 h-8 text-slate-400 animate-pulse" />
            </div>
            <p className="text-lg font-medium text-slate-600">Loading your classes...</p>
          </div>
        ) : classes.length === 0 ? (
          <div className="text-center py-12 sm:py-16 bg-white/80 backdrop-blur-sm border border-slate-200/60 rounded-2xl shadow-lg shadow-slate-200/50">
            <div className="inline-flex items-center justify-center w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-br from-emerald-50 to-green-100 mb-4 sm:mb-6">
              <BookOpen className="w-8 h-8 sm:w-10 sm:h-10 text-emerald-500" />
            </div>
            <h3 className="text-xl sm:text-2xl font-bold text-slate-900 mb-2 sm:mb-3">No classes yet</h3>
            <p className="text-sm sm:text-base text-slate-600 mb-6 sm:mb-8 max-w-md mx-auto leading-relaxed px-4">
              Add your first class to get a study map, a start-here path, and a focused study workspace.
            </p>
            <Button 
              onClick={handleAddClass} 
              className="bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 text-white shadow-md shadow-emerald-500/30 hover:shadow-lg hover:shadow-emerald-500/40 transition-all duration-200 transform hover:scale-105 active:scale-95"
            >
              <Plus className="w-4 h-4 mr-2" />
              Create Your First Class
            </Button>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 auto-rows-fr">
            {classes.map((classItem) => (
              <ClassWithMaterials
                key={classItem.id}
                classItem={classItem}
                onEdit={handleEditClass}
                onRefresh={handleRefresh}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

