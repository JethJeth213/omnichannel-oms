import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

export default function AdminRoute({ children }) {
  const [isAdmin, setIsAdmin] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    checkAdminStatus()
  }, [])

  const checkAdminStatus = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    
    if (!session) {
      window.location.href = '/'
      return
    }

    const { data: user } = await supabase
      .from('users')
      .select('role')
      .eq('id_auth_link', session.user.id)
      .single()

    if (user?.role === 'admin') {
      setIsAdmin(true)
    } else {
      alert('Access denied. Admin only.')
      window.location.href = '/'
    }
    
    setLoading(false)
  }

  if (loading) {
    return <div className="text-center py-12">Checking permissions...</div>
  }

  return isAdmin ? children : null
}