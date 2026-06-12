import { useState } from 'react'

export default function ShoppingCart({ cart, onUpdateQuantity, onRemoveItem, onCheckout, loading = false }) {
  const [isOpen, setIsOpen] = useState(false)
  
  const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0)
  const totalPrice = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0)

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-20 md:bottom-6 right-4 md:right-6 bg-orange-600 text-white p-3 md:p-4 rounded-full shadow-lg hover:bg-orange-700 transition-all duration-200 transform hover:scale-110 active:scale-95 z-40 group"
      >
        <div className="relative">
          <span className="text-xl md:text-2xl group-hover:rotate-12 transition-transform duration-200">🛒</span>
          {totalItems > 0 && (
            <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center animate-bounce">
              {totalItems}
            </span>
          )}
        </div>
      </button>

      {isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-end md:items-center justify-center p-0 md:p-4 animate-fadeIn">
          <div className="bg-white rounded-t-xl md:rounded-lg max-w-md w-full max-h-[85vh] md:max-h-[80vh] flex flex-col animate-slideUp md:animate-fadeIn">
            <div className="p-4 border-b flex justify-between items-center sticky top-0 bg-white rounded-t-xl">
              <h2 className="text-lg md:text-xl font-bold">Your Order 🍽️</h2>
              <button
                onClick={() => setIsOpen(false)}
                className="text-gray-500 hover:text-gray-700 text-xl p-2 transition-transform hover:rotate-90 duration-200"
              >
                ✕
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4">
              {loading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600 mx-auto"></div>
                  <p className="text-gray-500 mt-2">Loading cart...</p>
                </div>
              ) : cart.length === 0 ? (
                <p className="text-center text-gray-500 py-8">Your cart is empty. Add some delicious food!</p>
              ) : (
                <div className="space-y-4">
                  {cart.map((item, index) => (
                    <div key={item.id} className="flex gap-3 items-center border-b pb-4 animate-fadeIn" style={{ animationDelay: `${index * 0.05}s` }}>
                      <img src={item.image_url} alt={item.name} className="w-12 h-12 md:w-16 md:h-16 object-cover rounded" />
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-sm md:text-base truncate">{item.name}</h3>
                        <p className="text-orange-600 font-bold text-sm md:text-base">${item.price.toFixed(2)}</p>
                      </div>
                      <div className="flex items-center gap-1 md:gap-2">
                        <button
                          onClick={() => onUpdateQuantity(item.id, item.quantity - 1)}
                          className="w-7 h-7 md:w-8 md:h-8 bg-gray-200 rounded hover:bg-gray-300 transition-all duration-200 transform hover:scale-110 active:scale-95 text-lg"
                        >
                          -
                        </button>
                        <span className="w-6 md:w-8 text-center text-sm md:text-base font-semibold">{item.quantity}</span>
                        <button
                          onClick={() => onUpdateQuantity(item.id, item.quantity + 1)}
                          className="w-7 h-7 md:w-8 md:h-8 bg-gray-200 rounded hover:bg-gray-300 transition-all duration-200 transform hover:scale-110 active:scale-95 text-lg"
                        >
                          +
                        </button>
                        <button
                          onClick={() => onRemoveItem(item.id)}
                          className="ml-1 md:ml-2 text-red-500 hover:text-red-700 transition-all duration-200 transform hover:scale-110"
                        >
                          🗑️
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            <div className="p-4 border-t sticky bottom-0 bg-white">
              <div className="flex justify-between mb-4">
                <span className="font-semibold text-sm md:text-base">Total:</span>
                <span className="text-lg md:text-xl font-bold text-orange-600">${totalPrice.toFixed(2)}</span>
              </div>
              <button
                onClick={onCheckout}
                disabled={cart.length === 0 || loading}
                className={`w-full py-2 md:py-3 rounded-lg font-semibold transition-all duration-200 transform hover:scale-105 text-sm md:text-base ${
                  cart.length > 0 && !loading
                    ? 'bg-orange-600 hover:bg-orange-700 text-white active:scale-95'
                    : 'bg-gray-300 cursor-not-allowed text-gray-500'
                }`}
              >
                Checkout 🍽️
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}