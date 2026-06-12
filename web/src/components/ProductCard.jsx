export default function ProductCard({ product, onAddToCart }) {
  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
      {/* Product Image */}
      <div className="h-48 overflow-hidden bg-gray-100">
        <img 
          src={product.image_url} 
          alt={product.name}
          className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
        />
      </div>
      
      {/* Product Info */}
      <div className="p-4">
        <h3 className="font-semibold text-lg mb-1">{product.name}</h3>
        <p className="text-gray-600 text-sm mb-3 line-clamp-2">{product.description}</p>
        
        <div className="flex justify-between items-center mb-3">
          <span className="text-2xl font-bold text-orange-600">
            ${product.price.toFixed(2)}
          </span>
          <span className="text-sm text-gray-500">
            {product.stock_quantity > 0 ? `🍽️ ${product.stock_quantity} left` : 'Out of stock'}
          </span>
        </div>
        
        <button
          onClick={() => onAddToCart(product)}
          disabled={product.stock_quantity === 0}
          className={`w-full py-2 px-4 rounded-lg font-semibold transition ${
            product.stock_quantity > 0
              ? 'bg-orange-600 hover:bg-orange-700 text-white'
              : 'bg-gray-300 cursor-not-allowed text-gray-500'
          }`}
        >
          {product.stock_quantity > 0 ? 'Add to Cart 🛒' : 'Out of Stock'}
        </button>
      </div>
    </div>
  )
}