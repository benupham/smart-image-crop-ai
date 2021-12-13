import React, { useMemo, useEffect, useState } from "react"
import "./dashboard.css"
import { collateThumbs } from "./helper"
import Thumbnail from "./Thumbnail"
import FilterBar from "./Filterbar"
import lodash from "lodash"
import { requestSmartCrop } from "./api"

const Dashboard = ({ urls, nonce, croppedSizes, setNotice }) => {
  const [thumbs, setThumbs] = useState([])
  const [query, setQuery] = useState("")
  const [page, setPage] = useState(1)
  const [filterCropped, setCropFilter] = useState(true)
  const [errorMessage, setErrorMessage] = useState("")
  const [pageLoading, setPageLoading] = useState(true)
  const [cropsLoading, setCropsLoading] = useState(false)
  const [lastPage, setLastPage] = useState(null)

  const handleSubmit = async (e) => {
    setCropsLoading(true)

    const preview = e.target.id === "save" ? false : true

    const reqCrops = thumbs.filter((thumb) => thumb.isChecked === true)
    const promisesPromises = reqCrops.map(async (thumb) => {
      const newThumb = await requestSmartCrop(preview, thumb, setNotice, urls, nonce)
      const newThumbs = thumbs.map((t) => (newThumb.file === t.file ? (t = newThumb) : t))
      setThumbs(newThumbs)
    })
    await Promise.all(promisesPromises)

    setCropsLoading(false)
  }

  const handleSearch = (e) => {
    const query = e.target.value
    setQuery(query)
    setPage(1)
    setLastPage(null)
  }

  const handleCropFilter = (filterCropped) => {
    setCropsLoading(true)
    setCropFilter(filterCropped)
    setCropsLoading(false)
  }

  const debouncedSearch = useMemo(() => lodash.debounce(handleSearch, 200), [])

  const handleThumbChecked = (e, i) => {
    const value = e.target.checked
    const newThumbs = thumbs.map((thumb, index) =>
      index === i ? { ...thumb, isChecked: value } : thumb
    )
    setThumbs(newThumbs)
  }

  useEffect(() => {
    const requestImages = async (attachmentId) => {
      if (!window.smart_image_crop_ajax || !window.smart_image_crop_ajax.urls) {
        console.error("Can't find WordPress API endpoints.")
        setErrorMessage(
          "Can't find WordPress REST API endpoints. Is the API restricted or turned off?"
        )
      }
      const mediaApi = window.smart_image_crop_ajax.urls.media
      const nonce = window.smart_image_crop_ajax.nonce

      const id = query.length > 0 || page > 1 ? "" : attachmentId

      const conn = mediaApi.indexOf("?") > -1 ? "&" : "?"
      const url = `${mediaApi}${conn}include=${id}&search=${query}&page=${page}&per_page=40&mime_type=image/png,image/jpg,image/webp`

      const response = await fetch(url, {
        headers: new Headers({ "X-WP-Nonce": nonce })
      })
      const data = await response.json()

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
      const thumbs = collateThumbs(data, croppedSizes, filterCropped)
      setThumbs(thumbs)
    }

    const queryString = window.location.search
    const urlParams = new URLSearchParams(queryString)
    const id = urlParams.get("attachmentId") ? urlParams.get("attachmentId") : ""

    requestImages(id)
  }, [query, page, filterCropped])

  return (
    <div className="smart_image_crop_wrapper wrap">
      <FilterBar
        handleSubmit={handleSubmit}
        handleSearch={debouncedSearch}
        handleCropFilter={handleCropFilter}
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
        {errorMessage && (
          <div className="error settings-error">
            <p>{errorMessage}</p>
          </div>
        )}
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
        {!errorMessage &&
          thumbs &&
          thumbs.map((thumb, index) => (
            <Thumbnail thumb={thumb} key={index} index={index} handleChange={handleThumbChecked} />
          ))}
      </div>
    </div>
  )
}

export default Dashboard
