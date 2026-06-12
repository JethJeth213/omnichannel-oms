import { useState } from 'react'

export default function ProductCard({ product, onAddToCart }) {
  const [isAdding, setIsAdding] = useState(false)

  const handleAddToCart = () => {
    if (isAdding) return
    
    setIsAdding(true)
    onAddToCart(product)
    
    setTimeout(() => {
      setIsAdding(false)
    }, 500)
  }

  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-xl transition-all duration-300 transform hover:-translate-y-2 group">
      <div className="h-40 sm:h-48 overflow-hidden bg-gray-100">
        <img 
          src={product.image_url} 
          alt={product.name}
          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
        />
      </div>
      
      <div className="p-3 sm:p-4">
        <h3 className="font-semibold text-base sm:text-lg mb-1 line-clamp-1">{product.name}</h3>
        <p className="text-gray-600 text-xs sm:text-sm mb-2 line-clamp-2">{product.description}</p>
        
        <div className="flex justify-between items-center mb-3">
          <span className="text-xl sm:text-2xl font-bold text-orange-600">
            ${product.price.toFixed(2)}
          </span>
          <span className="text-xs sm:text-sm text-gray-500">
            {product.stock_quantity > 0 ? `🍽️ ${product.stock_quantity} left` : 'Out of stock'}
          </span>
        </div>
        
        <button
          onClick={handleAddToCart}
          disabled={product.stock_quantity === 0 || isAdding}
          className={`w-full py-2 px-3 sm:px-4 rounded-lg font-semibold transition-all duration-200 transform hover:scale-105 text-sm sm:text-base ${
            product.stock_quantity > 0 && !isAdding
              ? 'bg-orange-600 hover:bg-orange-700 text-white active:scale-95'
              : 'bg-gray-300 cursor-not-allowed text-gray-500'
          }`}
        >
          {isAdding ? (
            <span className="flex items-center justify-center gap-2">
              <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Adding...
            </span>
          ) : (product.stock_quantity > 0 ? 'Add to Cart 🛒' : 'Out of Stock')}
        </button>
      </div>
    </div>
  )
}