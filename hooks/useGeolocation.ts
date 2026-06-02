'use client'
import { useState, useEffect } from 'react'

interface Location {
  lat: number
  lng: number
}

export function useGeolocation() {
  const [location, setLocation] = useState<Location | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!navigator.geolocation) {
      setError('이 브라우저는 위치 서비스를 지원하지 않습니다.')
      setLoading(false)
      return
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude })
        setLoading(false)
      },
      (err) => {
        // 위치 권한 거부 시 서울 기본값
        setLocation({ lat: 37.5759, lng: 126.9769 })
        setError('위치 권한이 없어 기본 위치(서울)를 사용합니다.')
        setLoading(false)
      },
      { enableHighAccuracy: true, timeout: 5000 }
    )
  }, [])

  return { location, error, loading }
}
