import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

export default function AdminOrders() {
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchAllOrders()
  }, [])

  const fetchAllOrders = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('orders')
      .select(`
        *,
        users (full_name, email, phone_number, delivery_address),
        order_items (
          quantity,
          price_at_purchase,
          products (name)
        )
      `)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching orders:', error)
    } else {
      setOrders(data || [])
    }
    setLoading(false)
  }

  const updateOrderStatus = async (orderId, newStatus) => {
    const { error } = await supabase
      .from('orders')
      .update({ status: newStatus })
      .eq('id', orderId)

    if (error) {
      alert('Error updating order status')
    } else {
      fetchAllOrders()
      alert(`Order #${orderId} updated to ${newStatus}`)
    }
  }

  const statusOptions = ['Pending', 'Preparing', 'Out for Delivery', 'Delivered', 'Cancelled']

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Admin Dashboard - Orders</h1>
      
      {loading ? (
        <p>Loading orders...</p>
      ) : orders.length === 0 ? (
        <p>No orders yet.</p>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => (
            <div key={order.id} className="bg-white rounded-lg shadow p-4">
              <div className="flex justify-between items-start">
                <div>
                  <p className="font-semibold">Order #{order.id}</p>
                  <p className="text-sm text-gray-500">
                    {order.users?.full_name || 'Customer'} | {order.users?.phone_number || 'No phone'}
                  </p>
                  <p className="text-sm text-gray-500">
                    {new Date(order.created_at).toLocaleString()}
                  </p>
                  <p className="text-sm mt-2">
                    {order.users?.delivery_address}
                  </p>
                </div>
                <div className="text-right">
                  <select
                    value={order.status}
                    onChange={(e) => updateOrderStatus(order.id, e.target.value)}
                    className={`px-3 py-1 rounded text-sm font-semibold border ${
                      order.status === 'Delivered' ? 'bg-green-100 text-green-800' :
                      order.status === 'Preparing' ? 'bg-blue-100 text-blue-800' :
                      order.status === 'Out for Delivery' ? 'bg-purple-100 text-purple-800' :
                      order.status === 'Cancelled' ? 'bg-red-100 text-red-800' :
                      'bg-yellow-100 text-yellow-800'
                    }`}
                  >
                    {statusOptions.map(status => (
                      <option key={status} value={status}>{status}</option>
                    ))}
                  </select>
                  <p className="font-bold text-orange-600 mt-2">
                    ${order.total_amount.toFixed(2)}
                  </p>
                </div>
              </div>
              
              <div className="border-t mt-3 pt-3">
                <p className="text-sm font-semibold">Items:</p>
                <div className="text-sm text-gray-600">
                  {order.order_items?.map((item, idx) => (
                    <span key={idx}>
                      {item.quantity}x {item.products?.name}
                      {idx < order.order_items.length - 1 ? ', ' : ''}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}