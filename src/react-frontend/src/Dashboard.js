import React, { useEffect, useState } from "react"
import "./dashboard.css"
import { collateThumbs } from "./helper"
import Thumbnail from "./Thumbnail"
import FilterBar from "./Filterbar"

const Dashboard = ({ urls, nonce, croppedSizes }) => {
  const [images, setImages] = useState([])
  const [thumbs, setThumbs] = useState([])
  const [query, setQuery] = useState("")
  const [page, setPage] = useState(1)
  const [errorMessage, setErrorMessage] = useState("")
  const [pageLoading, setPageLoading] = useState(true)
  const [cropsLoading, setCropsLoading] = useState(false)
  const [lastPage, setLastPage] = useState(null)

  const requestSmartCrop = async (preview = true, thumb) => {
    const isPreview = preview === true ? 1 : 0
    const { size, attachment } = thumb
    const sizeURI = encodeURIComponent(size)
    const reqUrl = `${urls.proxy}?attachment=${attachment.id}&size=${sizeURI}&pre=${isPreview}`
    console.log("reqURL", reqUrl)
    const response = await fetch(reqUrl, {
      headers: new Headers({ "X-WP-Nonce": nonce })
    })
    console.log("inner response", response)
    if (response.ok === false || response.status !== 200) {
      console.error(response)
      const errorString = `Error. Status ${response.status}. 
      Message: ${response.statusText}
      URL: ${response.url}`
      setErrorMessage(errorString)
      return false
    }
    const json = await response.json()
    console.log("json", json)

    if (json.success !== true) {
      console.log("json error")
      console.error(json)
      setErrorMessage(json.body)
      return false
    }

    if (json.success === true) {
      thumb.smartcrop = true
      if (preview === true) {
        thumb.url = json.body.smartcrop.image_url
      } else {
        thumb.isChecked = false
        thumb.cacheId = Date.now()
        thumb.url = thumb.source_url
        thumb.previewFile = ""
      }
      const newThumbs = thumbs.map((t) => (thumb.file === t.file ? (t = thumb) : t))
      setThumbs(newThumbs)
      return json.body.smartcrop
    }
  }

  const handleSubmit = async (e) => {
    // e.preventDefault();
    setCropsLoading(true)
    const preview = e.target.id === "save" ? false : true
    console.log("preview", preview)
    console.log("e", e)

    const reqCrops = thumbs.filter((thumb) => thumb.isChecked === true)
    const promisesPromises = reqCrops.map(async (thumb) => {
      const response = await requestSmartCrop(preview, thumb)
      return response
    })
    const previews = await Promise.all(promisesPromises)
    console.log(previews)
    setCropsLoading(false)
  }

  const handleSearch = (e) => {
    const query = e.target.value
    setQuery(query)
    setPage(1)
    setLastPage(null)
  }

  const handleThumbChecked = (e, i) => {
    const value = e.target.checked
    const newThumbs = thumbs.map((thumb, index) =>
      index === i ? { ...thumb, isChecked: value } : thumb
    ) // May need to be a deep clone...I am doing this wrong.
    console.log(newThumbs[i].isChecked)
    setThumbs(newThumbs)
  }

  useEffect(() => {
    const requestImages = async (attachmentId) => {
      if (!window.smart_image_crop_ajax || !window.smart_image_crop_ajax.urls) {
        console.error("Can't find WP API endpoints.")
      }
      const mediaApi = window.smart_image_crop_ajax.urls.media
      const nonce = window.smart_image_crop_ajax.nonce

      const id = query.length > 0 || page > 1 ? "" : attachmentId
      console.log("id", id)

      const conn = mediaApi.indexOf("?") > -1 ? "&" : "?"
      const url = `${mediaApi}${conn}include=${id}&search=${query}&page=${page}&mime_type=image/png,image/jpg,image/webp`
      console.log("url", url)

      const response = await fetch(url, {
        headers: new Headers({ "X-WP-Nonce": nonce })
      })

      const data = await response.json()
      console.log(data)
      setPageLoading(false)

      if (data.length === 0) {
        setErrorMessage("No image sizes found.")
        setThumbs([])
        return
      }

      if (data.code && data.code === "rest_post_invalid_page_number") {
        setLastPage(page)
        setPage(page - 1)
        return
      }

      if (data.code) {
        setErrorMessage(`There was an error: ${data.message}`)
        return
      }

      setErrorMessage("")
      setImages(data)
    }

    const queryString = window.location.search
    const urlParams = new URLSearchParams(queryString)
    const id = urlParams.get("attachmentId") ? urlParams.get("attachmentId") : ""

    requestImages(id)
  }, [query, page])

  useEffect(() => {
    const thumbs = collateThumbs(images, croppedSizes)
    setThumbs(thumbs)
  }, [images, croppedSizes])

  return (
    <div className="smart_image_crop_wrapper wrap">
      <FilterBar
        handleSubmit={handleSubmit}
        handleSearch={handleSearch}
        setPage={setPage}
        cropsLoading={cropsLoading}
        page={page}
        lastPage={lastPage}
      />
      <div
        className={
          cropsLoading === true
            ? "crops-loading smart_image_crop_thumbs"
            : "smart_image_crop_thumbs"
        }>
        {errorMessage.length > 0 && <div className="error-message">{errorMessage}</div>}
        {pageLoading === true && (
          <div className="loading">
            <div className="lds-ring">
              <div></div>
              <div></div>
              <div></div>
              <div></div>
            </div>
          </div>
        )}
        {thumbs &&
          thumbs.map((thumb, index) => (
            <Thumbnail thumb={thumb} key={index} index={index} handleChange={handleThumbChecked} />
          ))}
      </div>
    </div>
  )
}

export default Dashboard
