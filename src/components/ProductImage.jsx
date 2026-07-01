import { useState } from 'react'
import { Loader2 } from 'lucide-react'

export default function ProductImage({ src, alt = 'Product', className = '' }) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [imageLoaded, setImageLoaded] = useState(false)

  const showFallback = !src || error

  return (
    <div className={`product-image-container ${className}`}>
      {loading && !showFallback && (
        <div className="product-image-loading">
          <Loader2 size={24} className="loading-spinner" />
        </div>
      )}
      
      {showFallback ? (
        <img
          src="/no-image-found.svg"
          alt="No image available"
          className="product-image-fallback"
        />
      ) : (
        <img
          src={src}
          alt={alt}
          className={`product-image-img ${imageLoaded ? 'loaded' : ''}`}
          onLoad={() => {
            setLoading(false)
            setImageLoaded(true)
          }}
          onError={() => {
            setLoading(false)
            setError(true)
          }}
        />
      )}
    </div>
  )
}
