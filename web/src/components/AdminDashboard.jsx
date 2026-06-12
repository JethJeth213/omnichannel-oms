import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import toast from 'react-hot-toast'
import AdminChatPage from './AdminChatPage'

export default function AdminDashboard({ onBack }) {
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [visibleOrders, setVisibleOrders] = useState(5)
  const [activeTab, setActiveTab] = useState('orders')
  const [showChatPage, setShowChatPage] = useState(false)
  const [stats, setStats] = useState({
    totalOrders: 0,
    totalRevenue: 0,
    pendingOrders: 0,
    deliveredToday: 0
  })

  // All hooks must be called before any conditional returns
  useEffect(() => {
    fetchAllOrders()
  }, [])

  const fetchAllOrders = async () => {
    setLoading(true)
    
    const { data: ordersData, error: ordersError } = await supabase
      .from('orders')
      .select('*')
      .order('created_at', { ascending: false })

    if (ordersError) {
      console.error('Error fetching orders:', ordersError)
      toast.error('Failed to load orders')
      setLoading(false)
      return
    }

    const ordersWithUsers = await Promise.all(
      (ordersData || []).map(async (order) => {
        const { data: userData } = await supabase
          .from('users')
          .select('id, full_name, email, phone_number, delivery_address')
          .eq('id', order.user_id)
          .single()
        
        const { data: itemsData } = await supabase
          .from('order_items')
          .select(`
            id,
            quantity,
            price_at_purchase,
            product_id
          `)
          .eq('order_id', order.id)
        
        const itemsWithProducts = await Promise.all(
          (itemsData || []).map(async (item) => {
            const { data: productData } = await supabase
              .from('products')
              .select('id, name, image_url')
              .eq('id', item.product_id)
              .single()
            
            return {
              ...item,
              products: productData
            }
          })
        )
        
        return {
          ...order,
          users: userData,
          order_items: itemsWithProducts
        }
      })
    )

    setOrders(ordersWithUsers)
    calculateStats(ordersWithUsers)
    setLoading(false)
  }

  const calculateStats = (ordersData) => {
    const totalOrders = ordersData.length
    const totalRevenue = ordersData
      .filter(order => order.status === 'Delivered')
      .reduce((sum, order) => sum + (order.total_amount || 0), 0)
    const pendingOrders = ordersData.filter(o => o.status === 'Pending').length
    const today = new Date().toDateString()
    const deliveredToday = ordersData.filter(o => {
      return o.status === 'Delivered' && new Date(o.created_at).toDateString() === today
    }).length

    setStats({ totalOrders, totalRevenue, pendingOrders, deliveredToday })
  }

  const updateOrderStatus = async (orderId, newStatus) => {
    const { error } = await supabase
      .from('orders')
      .update({ status: newStatus })
      .eq('id', orderId)

    if (error) {
      toast.error('Error updating order status')
    } else {
      toast.success(`Order #${orderId} updated to ${newStatus}`)
      fetchAllOrders()
    }
  }

  const statusOptions = ['Pending', 'Preparing', 'Out for Delivery', 'Delivered', 'Cancelled']
  
  const getStatusColor = (status) => {
    switch(status) {
      case 'Delivered': return 'bg-green-100 text-green-800'
      case 'Preparing': return 'bg-blue-100 text-blue-800'
      case 'Out for Delivery': return 'bg-purple-100 text-purple-800'
      case 'Cancelled': return 'bg-red-100 text-red-800'
      default: return 'bg-yellow-100 text-yellow-800'
    }
  }

  const getStatusIcon = (status) => {
    switch(status) {
      case 'Delivered': return '✅'
      case 'Preparing': return '👨‍🍳'
      case 'Out for Delivery': return '🚚'
      case 'Cancelled': return '❌'
      default: return '⏳'
    }
  }

  // Conditional returns AFTER all hooks
  if (showChatPage) {
    return <AdminChatPage onBack={() => setShowChatPage(false)} />
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100">
        <div className="bg-white shadow p-4 flex justify-between items-center">
          <h1 className="text-xl font-bold text-orange-600">👑 Admin Dashboard</h1>
          <div className="w-24 h-8 bg-gray-200 rounded animate-pulse"></div>
        </div>
        <div className="container mx-auto p-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            {[1,2,3,4].map((i) => (
              <div key={i} className="bg-white rounded-lg shadow p-6 h-28 animate-pulse bg-gray-200"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <div className="bg-white shadow sticky top-0 z-30">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-orange-600">👑 Admin Dashboard</h1>
            <p className="text-sm text-gray-500">Manage orders and customer support</p>
          </div>
          <button
            onClick={onBack}
            className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600 transition duration-200"
          >
            ← Back to Store
          </button>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="container mx-auto px-4 py-4">
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setActiveTab('orders')}
            className={`px-6 py-2 rounded-lg font-semibold transition-all duration-200 ${
              activeTab === 'orders'
                ? 'bg-orange-600 text-white shadow-lg'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            📦 Orders
          </button>
          <button
            onClick={() => setShowChatPage(true)}
            className="px-6 py-2 rounded-lg font-semibold transition-all duration-200 bg-gray-200 text-gray-700 hover:bg-gray-300"
          >
            💬 Customer Chat
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      {activeTab === 'orders' && (
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-500 text-sm">Total Orders</p>
                  <p className="text-3xl font-bold">{stats.totalOrders}</p>
                </div>
                <div className="text-3xl">📦</div>
              </div>
            </div>
            
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-500 text-sm">Total Revenue</p>
                  <p className="text-3xl font-bold text-green-600">${stats.totalRevenue.toFixed(2)}</p>
                  <p className="text-xs text-gray-400">(Only delivered orders)</p>
                </div>
                <div className="text-3xl">💰</div>
              </div>
            </div>
            
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-500 text-sm">Pending Orders</p>
                  <p className="text-3xl font-bold text-yellow-600">{stats.pendingOrders}</p>
                </div>
                <div className="text-3xl">⏳</div>
              </div>
            </div>
            
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-500 text-sm">Delivered Today</p>
                  <p className="text-3xl font-bold text-green-600">{stats.deliveredToday}</p>
                </div>
                <div className="text-3xl">✅</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Orders List */}
      {activeTab === 'orders' && (
        <div className="container mx-auto px-4 pb-8">
          <h2 className="text-2xl font-bold mb-4">All Orders</h2>
          
          {orders.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-lg shadow">
              <p className="text-gray-500">No orders yet.</p>
              <p className="text-sm text-gray-400 mt-2">Orders will appear here once customers place them.</p>
            </div>
          ) : (
            <>
              <div className="space-y-4">
                {orders.slice(0, visibleOrders).map((order) => (
                  <div key={order.id} className="bg-white rounded-lg shadow overflow-hidden">
                    <div className="p-4 border-b bg-gray-50">
                      <div className="flex justify-between items-center flex-wrap gap-3">
                        <div>
                          <p className="font-bold text-lg">Order #{order.id}</p>
                          <p className="text-sm text-gray-500">
                            {new Date(order.created_at).toLocaleString()}
                          </p>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className={`px-3 py-1 rounded-full text-sm font-semibold ${getStatusColor(order.status)}`}>
                            {getStatusIcon(order.status)} {order.status}
                          </span>
                          <select
                            value={order.status}
                            onChange={(e) => updateOrderStatus(order.id, e.target.value)}
                            className="px-3 py-1 border rounded text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                          >
                            {statusOptions.map(status => (
                              <option key={status} value={status}>{status}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                    </div>
                    
                    <div className="p-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                        <div>
                          <p className="text-sm font-semibold text-gray-700">Customer</p>
                          <p className="text-gray-600">{order.users?.full_name || 'Unknown'}</p>
                          <p className="text-sm text-gray-500">{order.users?.email}</p>
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-gray-700">Contact</p>
                          <p className="text-gray-600">{order.users?.phone_number || 'No phone'}</p>
                          <p className="text-sm text-gray-500">{order.users?.delivery_address || 'No address'}</p>
                        </div>
                      </div>
                      
                      {order.order_items && order.order_items.length > 0 && (
                        <div className="border-t pt-3">
                          <p className="text-sm font-semibold text-gray-700 mb-2">Items:</p>
                          <div className="space-y-2">
                            {order.order_items.map((item, idx) => (
                              <div key={idx} className="flex justify-between text-sm">
                                <span>
                                  {item.quantity}x {item.products?.name || `Product #${item.product_id}`}
                                </span>
                                <span className="font-semibold">
                                  ${(item.price_at_purchase * item.quantity).toFixed(2)}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      <div className="border-t pt-3 mt-3 flex justify-between">
                        <span className="font-bold">Total</span>
                        <span className="font-bold text-orange-600">${order.total_amount.toFixed(2)}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              
              {orders.length > visibleOrders && (
                <div className="text-center mt-6">
                  <button
                    onClick={() => setVisibleOrders(prev => prev + 5)}
                    className="bg-gray-200 hover:bg-gray-300 text-gray-700 px-6 py-2 rounded-lg transition font-semibold"
                  >
                    Show 5 More ({orders.length - visibleOrders} remaining)
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  )
}