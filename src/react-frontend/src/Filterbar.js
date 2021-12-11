import React, { useState } from "react"
import "./filterbar.css"

const FilterBar = ({ handleSearch, handleSubmit, setPage, cropsLoading, page, lastPage }) => {
  const [previewMode, setPreviewMode] = useState(true)

  return (
    <div className="filterbar">
      <div className="pagination">
        <input
          type="text"
          disabled={cropsLoading}
          onChange={handleSearch}
          placeholder="Search images"
        />
        <button
          disabled={cropsLoading || page === 1}
          onClick={() => setPage(page - 1)}
          className="prev button button-primary">
          Prev Page
        </button>
        <button
          disabled={cropsLoading || page === lastPage - 1}
          onClick={() => setPage(page + 1)}
          className="next button button-primary">
          Next Page
        </button>
      </div>
      <div className="filter-cropped">
        <select name="filter-cropped" id="filter-cropped">
          <option value="uncropped">Unsmartcropped only</option>
          <option value="all">All images</option>
        </select>
      </div>
      <div className="saving">
        <input
          type="checkbox"
          checked={previewMode}
          id="preview-mode"
          name="preview-mode"
          onChange={(e) => {
            console.log(e.target.checked)
            setPreviewMode(e.target.checked)
          }}></input>
        <label htmlFor="preview-mode">Preview Mode</label>
        <button
          disabled={cropsLoading}
          onClick={handleSubmit}
          className="button"
          id={previewMode === false ? "save" : "preview"}>
          {previewMode === false ? (
            <span style={{ color: "red" }}>Save & Overwrite</span>
          ) : (
            "Preview"
          )}
        </button>
      </div>
    </div>
  )
}

export default FilterBar
