// Only the getObserver function is being used here. Rest is a custom hook in development.
import { useRef, useEffect, useState } from "react"

export function infiniteScroll(loader, lastPage) {
  const observerRef = useRef(null)
  const [isOnScreen, setIsOnScreen] = useState(false)

  useEffect(() => {
    const options = {
      root: null,
      rootMargin: "33%",
      threshold: 0
    }

    const observer = getObserver(observerRef, handleObserver, options)
    if (loader.current) {
      observer.observe(loader.current)
    }
    if (lastPage) {
      console.log("disconnected observer")
      return observer.disconnect()
    }
  }, [lastPage])

  const handleObserver = (entities) => {
    const target = entities[0]
    setIsOnScreen(target.isIntersecting)
  }
  return isOnScreen
}

export function getObserver(ref, handleObserver, options) {
  let observer = ref.current
  if (observer !== null) {
    return observer
  }

  let newObserver = new IntersectionObserver(handleObserver, options)
  ref.current = newObserver
  return newObserver
}
