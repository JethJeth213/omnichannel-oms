export default function OrderTimeline({ currentStatus }) {
  const steps = [
    { status: 'Pending', icon: '📝', label: 'Order Placed', description: 'We received your order' },
    { status: 'Preparing', icon: '👨‍🍳', label: 'Preparing', description: 'Chef is cooking your meal' },
    { status: 'Out for Delivery', icon: '🚚', label: 'On The Way', description: 'Rider is delivering' },
    { status: 'Delivered', icon: '✅', label: 'Delivered', description: 'Enjoy your meal!' }
  ]

  // Find current step index
  const currentIndex = steps.findIndex(step => step.status === currentStatus)
  
  // If status is Cancelled, show different timeline
  if (currentStatus === 'Cancelled') {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-center">
        <div className="text-3xl mb-2">❌</div>
        <p className="text-red-600 font-semibold">Order Cancelled</p>
        <p className="text-sm text-gray-600">This order has been cancelled</p>
      </div>
    )
  }

  return (
    <div className="w-full py-4">
      <div className="flex items-center justify-between">
        {steps.map((step, index) => {
          const isCompleted = index <= currentIndex
          const isCurrent = index === currentIndex
          
          return (
            <div key={step.status} className="flex-1 relative">
              {/* Connector line */}
              {index < steps.length - 1 && (
                <div 
                  className={`absolute top-5 left-1/2 w-full h-0.5 ${
                    index < currentIndex ? 'bg-green-500' : 'bg-gray-300'
                  }`}
                  style={{ right: '-50%' }}
                />
              )}
              
              {/* Step circle */}
              <div className="relative flex flex-col items-center">
                <div 
                  className={`w-10 h-10 rounded-full flex items-center justify-center text-lg z-10 ${
                    isCompleted 
                      ? 'bg-green-500 text-white' 
                      : 'bg-gray-300 text-gray-500'
                  } ${isCurrent ? 'ring-4 ring-green-200' : ''}`}
                >
                  {isCompleted && index < currentIndex ? '✓' : step.icon}
                </div>
                <div className="text-center mt-2">
                  <p className={`text-xs font-semibold ${isCompleted ? 'text-green-600' : 'text-gray-500'}`}>
                    {step.label}
                  </p>
                  <p className="text-xs text-gray-400 hidden md:block">{step.description}</p>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}