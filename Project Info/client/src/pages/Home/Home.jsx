import React, { useEffect, useState } from 'react'
import { Lightbulb, ListChecks, ClipboardList, Bell } from 'lucide-react'
import { projectsAPI, tasksAPI, aiIdeationAPI } from '../../services/api'
import { useAuth } from '../../contexts/AuthContext'

const Home = () => {
  const { user } = useAuth()
  const [aiIdea, setAiIdea] = useState('')
  const [generatedIdeas, setGeneratedIdeas] = useState([])
  const [projects, setProjects] = useState([])
  const [tasks, setTasks] = useState([])
  const [recentMessages, setRecentMessages] = useState([])

  useEffect(() => {
    const load = async () => {
      try {
        // Ensure DB has data for demo
        await fetch('/api/analytics/ensure-seed', { method: 'POST' })
        const [p, t] = await Promise.all([
          projectsAPI.getAll().then(r => r.data.data || r.data),
          tasksAPI.getAll().then(r => r.data.data || r.data),
        ])
        setProjects(p || [])
        setTasks(t || [])
      } catch (e) {
        console.error(e)
      }
    }
    load()
  }, [])

  const handleGenerateIdea = async () => {
    if (!aiIdea.trim()) return
    try {
      let firstProjectId = projects?.[0]?._id || projects?.[0]?.id
      if (!firstProjectId) {
        const created = await projectsAPI.create({ name: 'Home AI Session', description: 'Auto-created for Ask AI' })
        const createdProject = created.data?.data || created.data
        firstProjectId = createdProject?._id || createdProject?.id
        if (firstProjectId) setProjects([createdProject])
      }
      const res = await aiIdeationAPI.create({
        title: 'Home Ask AI',
        prompt: aiIdea,
        projectId: firstProjectId,
        category: 'ideas',
      })
      const idea = res.data.data
      setGeneratedIdeas([{ id: idea._id, idea: aiIdea, aiResponse: idea.aiResponse }, ...generatedIdeas])
      setAiIdea('')
    } catch (e) {
      console.error(e)
    }
  }

  const badge = (priority) => {
    switch (priority) {
      case 'High':
        return 'bg-red-100 text-red-800'
      case 'Medium':
        return 'bg-yellow-100 text-yellow-800'
      default:
        return 'bg-green-100 text-green-800'
    }
  }

  return (
    <div className="h-full flex flex-col gap-0">
      {/* Top Row: Current Projects and Tasks */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-0 flex-1">
        <div className="bg-white rounded-lg border-b lg:border-r border-gray-200 p-6 flex flex-col min-h-[280px]">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-base font-semibold text-gray-900 flex items-center gap-2">
              <ListChecks className="w-4 h-4 text-blue-600" />
              Current Projects
            </h3>
          </div>
          <div className="flex-1 overflow-y-auto space-y-2 pr-1">
            {projects.length === 0 ? (
              <div className="p-3 rounded-lg border border-gray-100 bg-gray-50">No projects</div>
            ) : (
              projects.map((p) => (
                <div key={p._id} className="p-3 rounded-lg border border-gray-100 bg-gray-50">{p.name}</div>
              ))
            )}
          </div>
        </div>

        <div className="bg-white rounded-lg border-b border-gray-200 p-6 flex flex-col min-h-[280px]">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-base font-semibold text-gray-900 flex items-center gap-2">
              <ClipboardList className="w-4 h-4 text-purple-600" />
              Tasks
            </h3>
          </div>
          <div className="flex-1 overflow-y-auto space-y-2 pr-1">
            {tasks.length === 0 ? (
              <div className="p-3 rounded-lg border border-gray-100 bg-gray-50">No tasks</div>
            ) : (
              tasks.slice(0, 6).map((t) => (
                <div key={t._id} className="p-3 rounded-lg border border-gray-100 bg-gray-50 flex items-center justify-between">
                  <span>{t.title}</span>
                  <span className="px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-800">{t.status}</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Bottom Row: Ask AI and Recent Chat Messages */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-0 flex-1 min-h-[calc(100vh-280px)]">
        {/* Ask AI */}
        <section className="bg-white rounded-lg border-b lg:border-r border-gray-200 flex flex-col min-h-[100%]">
          <div className="flex items-center gap-2 p-4 border-b border-gray-100 font-semibold text-gray-900">
            <Lightbulb className="w-4 h-4 text-yellow-500" />
            Ask AI
          </div>
          <div className="p-4 space-y-3 overflow-y-auto flex-1">
            <textarea
              className="w-full min-h-[120px] bg-gray-50 border border-gray-200 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter your prompt..."
              value={aiIdea}
              onChange={(e) => setAiIdea(e.target.value)}
            />
            <button
              onClick={handleGenerateIdea}
              className="self-start bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
            >
              Generate
            </button>
            {generatedIdeas.length > 0 && (
              <div className="space-y-2">
                {generatedIdeas.map((g) => (
                  <div key={g.id} className="p-3 rounded-lg border border-gray-100 bg-gray-50">
                    <div className="font-medium mb-1">{g.idea}</div>
                    <div className="text-sm whitespace-pre-wrap text-gray-700">{g.aiResponse}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* Recent Chat Messages */}
        <section className="bg-white rounded-lg border-b border-gray-200 flex flex-col min-h-[100%]">
          <div className="flex items-center gap-2 p-4 border-b border-gray-100 font-semibold text-gray-900">
            <Bell className="w-4 h-4 text-indigo-500" />
            Recent Messages
          </div>
          <div className="p-4 overflow-y-auto flex-1 space-y-3">
            {recentMessages.length === 0 ? (
              <p className="text-sm text-gray-500">No recent messages.</p>
            ) : (
              recentMessages.map((message) => (
                <div key={message.id} className="p-3 rounded-lg border border-gray-100 bg-gray-50">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">{message.user}</p>
                      <p className="text-sm text-gray-700 mt-1">{message.message}</p>
                    </div>
                    <span className="text-xs text-gray-500 ml-2">{message.time}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>
      </div>
    </div>
  )
}

export default Home
