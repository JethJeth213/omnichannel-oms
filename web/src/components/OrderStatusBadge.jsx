export default function OrderStatusBadge({ status }) {
  const statusConfig = {
    'Pending': {
      color: 'bg-yellow-500',
      text: 'Pending',
      icon: '⏳',
      description: 'Your order is being reviewed'
    },
    'Preparing': {
      color: 'bg-blue-500',
      text: 'Preparing',
      icon: '👨‍🍳',
      description: 'Your food is being prepared'
    },
    'Out for Delivery': {
      color: 'bg-purple-500',
      text: 'Out for Delivery',
      icon: '🚚',
      description: 'Your order is on the way!'
    },
    'Delivered': {
      color: 'bg-green-500',
      text: 'Delivered',
      icon: '✅',
      description: 'Order completed. Enjoy your meal!'
    },
    'Cancelled': {
      color: 'bg-red-500',
      text: 'Cancelled',
      icon: '❌',
      description: 'Order has been cancelled'
    }
  }

  const config = statusConfig[status] || statusConfig['Pending']

  return (
    <div className="flex flex-col items-center">
      <div className={`${config.color} text-white px-3 py-1 rounded-full text-sm font-semibold inline-flex items-center gap-1`}>
        <span>{config.icon}</span>
        <span>{config.text}</span>
      </div>
      <p className="text-xs text-gray-500 mt-1">{config.description}</p>
    </div>
  )
}