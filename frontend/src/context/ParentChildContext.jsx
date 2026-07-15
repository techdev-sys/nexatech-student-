import { createContext, useContext, useState, useEffect } from 'react'
import api from '../api/axios'

const ParentChildContext = createContext(null)

/**
 * Provides the currently selected child ID for the parent portal.
 * Fetches the linked children list on mount and auto-selects the first child.
 * Wraps all parent portal pages so they can call useParentChild() instead of
 * each re-fetching the children list independently.
 */
export function ParentChildProvider({ children }) {
  const [childList, setChildList] = useState([])
  const [childId, setChildId]     = useState(null)
  const [loading, setLoading]     = useState(true)

  useEffect(() => {
    api.get('/api/portal/children')
      .then(r => {
        const list = r.data ?? []
        setChildList(list)
        if (list.length > 0) setChildId(list[0].id)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  return (
    <ParentChildContext.Provider value={{ childId, setChildId, childList, loading }}>
      {children}
    </ParentChildContext.Provider>
  )
}

export function useParentChild() {
  const ctx = useContext(ParentChildContext)
  if (!ctx) throw new Error('useParentChild must be used inside ParentChildProvider')
  return ctx
}
