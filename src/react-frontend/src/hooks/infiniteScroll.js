import React, { useRef, useEffect } from "react"

export function infiniteScroll(setPage, loader, lastPage) {
  const observerRef = useRef(null)

  function getObserver(handleObserver, options) {
    let observer = observerRef.current
    if (observer !== null) {
      return observer
    }

    let newObserver = new IntersectionObserver(handleObserver, options)
    observerRef.current = newObserver
    return newObserver
  }

  useEffect(() => {
    console.log("last page inside observer", lastPage)

    var options = {
      root: null,
      rootMargin: "20px",
      threshold: 1.0
    }

    const observer = getObserver(handleObserver, options)
    if (loader.current) {
      observer.observe(loader.current)
    }
    if (lastPage) {
      // observer.unobserve(loader.current)
      console.log("supposedly disconnected observer")
      return observer.disconnect()
    }
  }, [lastPage])

  const handleObserver = (entities) => {
    const target = entities[0]
    if (target.isIntersecting === true) {
      setPage((_page) => _page + 1)
      console.log("fired new page")
    }
  }
}
