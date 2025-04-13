import { useState, useRef } from 'react'
import axios from 'axios'
import ResponseRenderer from './ResponseRenderer'
import LoadingBlock from './LoadingBlock'

interface Answer {
  status: "success" | "error"
  answer: string
  diagram?: string
}

const ImageUploader = () => {
  const [selectedImage, setSelectedImage] = useState<string | null>(null)
  const [answer, setAnswer] = useState<Answer | null>(null)
  const [loading, setLoading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const [showCamera, setShowCamera] = useState(false)

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      // Clear previous answer and set loading state
      setAnswer(null)
      setLoading(true)
      
      const reader = new FileReader()
      reader.onloadend = () => {
        setSelectedImage(reader.result as string)
      }
      reader.readAsDataURL(file)
      await uploadImage(file)
    }
  }

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
      if (videoRef.current) {
        videoRef.current.srcObject = stream
      }
      setShowCamera(true)
      // Clear previous answer when camera is started
      setAnswer(null)
    } catch (error) {
      console.error('Error accessing camera:', error)
    }
  }

  const captureImage = async () => {
    if (videoRef.current) {
      // Clear previous answer and set loading state
      setAnswer(null)
      setLoading(true)

      const canvas = document.createElement('canvas')
      canvas.width = videoRef.current.videoWidth
      canvas.height = videoRef.current.videoHeight
      const ctx = canvas.getContext('2d')
      ctx?.drawImage(videoRef.current, 0, 0)
      
      canvas.toBlob(async (blob) => {
        if (blob) {
          setSelectedImage(canvas.toDataURL('image/jpeg'))
          await uploadImage(blob)
        }
      }, 'image/jpeg')

      // Stop camera stream
      const stream = videoRef.current.srcObject as MediaStream
      stream.getTracks().forEach(track => track.stop())
      setShowCamera(false)
    }
  }

  const uploadImage = async (file: Blob) => {
    setLoading(true)
    const formData = new FormData()
    formData.append('image', file)
    formData.append('question', 'Can you review this image and solve the question with step by step reasoning?')
    
    // Debug: Log FormData contents
    console.log('FormData contents:')
    for (const [key, value] of formData.entries()) {
      if (value instanceof Blob) {
        console.log(`${key}:`, {
          type: value.type,
          size: `${(value.size / 1024).toFixed(2)} KB`
        })
      } else {
        console.log(`${key}:`, value)
      }
    }

    try {
      const response = await axios.post<Answer>('/ask', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      })
      setAnswer(response.data)
    } catch (error) {
      console.error('Error uploading image:', error)
      setAnswer({ status: 'error', answer: 'Failed to process the image. Please try again.' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-white rounded-lg shadow-lg p-4 md:p-6 w-full">
      <h2 className="text-xl md:text-2xl font-bold mb-4 text-center">Multimodal QnA Agent</h2>
      
      {showCamera ? (
        <div className="relative">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            className="w-full rounded-lg"
          />
          <button
            onClick={captureImage}
            className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-blue-500 text-white px-4 py-2 rounded-full hover:bg-blue-600"
          >
            Capture
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex justify-center gap-3 md:gap-4">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="bg-blue-500 text-white px-3 py-2 md:px-4 md:py-2 rounded-lg hover:bg-blue-600 text-sm md:text-base"
            >
              Choose File
            </button>
            <button
              onClick={startCamera}
              className="bg-green-500 text-white px-3 py-2 md:px-4 md:py-2 rounded-lg hover:bg-green-600 text-sm md:text-base"
            >
              Take Photo
            </button>
          </div>
          
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileSelect}
            accept="image/*"
            className="hidden"
          />

          {selectedImage && (
            <div className="mt-4">
              <img
                src={selectedImage}
                alt="Selected"
                className="w-full rounded-lg"
              />
            </div>
          )}
        </div>
      )}

      {loading && <LoadingBlock />}

      {answer && (
        <div className="mt-4">
          <h3 className="font-semibold text-base md:text-lg">Answer:</h3>
          <div className={`p-3 md:p-4 rounded-lg mt-2 ${
            answer.status === 'error' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
          }`}>
            <ResponseRenderer data={answer} />
          </div>
        </div>
      )}
    </div>
  )
}

export default ImageUploader 