import React, { useEffect, useState, useCallback }  from 'react';
import './dashboard.css'
import { collateThumbs, getCroppedSizes } from './helper';
import Thumbnail from './Thumbnail';

const Dashboard = ({ urls, nonce }) => {
  const [croppedSizes, setSizes] = useState([]);
  const [images, setImages] = useState([]);
  const [thumbs, setThumbs] = useState([]);
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] = useState(10000);
  const [attachmentId, setAttachmentId] = useState('');
  // const [errorMessage, setErrorMessage] = useState('');

  const requestSmartCrop = async (preview = true, thumb) => {
    console.log(thumb)
    const isPreview = preview === true ? 1 : 0;
    const {size, attachment} = thumb;

    const reqUrl = `${urls.proxy}?attachment=${attachment.id}&size=${size}&pre=${isPreview}`
    console.log('reqURL',reqUrl)
    const response = await fetch(reqUrl, {
      headers: new Headers({ 'X-WP-Nonce': nonce}),
    })
    console.log('inner response', response)
    const json = await response.json();
    console.log('json', json)

    if (json.success === true) {
      if ( preview === true) {
        thumb.url = json.body.smartcrop.image_url; 
      } else {
        thumb.isChecked = false; 
        thumb.cacheId = Date.now(); 
      }
      const newThumbs = thumbs.map(t => (
        thumb.file === t.file ? t = thumb : t
      )); 
      // console.log(newThumbs[i].isChecked)
      setThumbs(newThumbs);
      return json.body.smartcrop; 
    } else {
      console.error(json);
      return false
    }
  
  } 

  const handleSubmit = async (e, preview = false) => {
    e.preventDefault();
    const reqCrops = thumbs.filter( thumb => thumb.isChecked === true);
    // console.log('reqCrops',reqCrops)
    const promisesPromises = reqCrops.map(async thumb => {
      // console.log('thumb', thumb)
      const response = await requestSmartCrop(preview, thumb);
      // console.log('outer response',response)
      return response
    })
    const previews = await Promise.all(promisesPromises);
    console.log(previews);
  }

  const handleSearch = (e) => {
    const query = e.target.value; 
    setQuery(query);
  }

  const handleThumbChecked = (e, i) => {
    const value = e.target.checked; 
    const newThumbs = thumbs.map((thumb, index) => (
      index === i ? {...thumb, isChecked: value} : thumb
    )); // May need to be a deep clone...I am doing this wrong. 
    console.log(newThumbs[i].isChecked)
    setThumbs(newThumbs);
  }

  const handlePageChange = useCallback( (event, page) => {
    
      event.preventDefault();
      setPage(page);

  },[setPage]);


  useEffect(() => {
    const croppedSizes = getCroppedSizes();
    setSizes(croppedSizes);

  }, [])

  useEffect( () => {

    const requestImages = async () => {

      if (!window.smart_image_crop_ajax || !window.smart_image_crop_ajax.urls) {
        console.error("Can't find WP API endpoints.");
      }
      const mediaApi = window.smart_image_crop_ajax.urls.media; 
      const nonce = window.smart_image_crop_ajax.nonce; 
  
      const id = query.length > 0 ? '' : attachmentId; 
      console.log('id',id);
      
      const conn = mediaApi.indexOf('?') > -1 ? '&' : '?';
      const url = `${mediaApi}${conn}include=${id}&search=${query}&page=${page}&mime_type=image/png,image/jpg,image/webp`;
      console.log('url', url)
      const response = await fetch(url, {
        headers: new Headers({ 'X-WP-Nonce': nonce } )
      })

      const data = await response.json();
      console.log(data);

      if (data.code && data.code === 'rest_post_invalid_page_number') {
        setPage(page - 1);
        return;
      }
      
      setImages(data);
    
    }

    const queryString = window.location.search;
    const urlParams = new URLSearchParams(queryString);
    const id = urlParams.get('attachmentId');
    if ( id != null ) {
      setAttachmentId(id);
    }    
    console.log(attachmentId);

    requestImages();

  }, [query, page, attachmentId])

  useEffect(() => {
    const thumbs = collateThumbs(images, croppedSizes);
      setThumbs(thumbs);  
  }, [images, croppedSizes])

  return (
     
    <div className="smart_image_crop_wrapper">
      <div className="image-sizes-list">
        <h2>Cropped Image Sizes</h2>
        <p>Only these image sizes are eligible for smart cropping. Other image sizes are not cropped.</p>
        <ul>
          {croppedSizes && croppedSizes.map(size => (
            <li key={size}>{size}</li>
          ))}
        </ul>
      </div>
      <button onClick={handleSubmit}>Submit</button> 
      <input type="text" onChange={handleSearch} placeholder="Search images"/> 
      <div className="smart_image_crop_thumbs">
            {thumbs && thumbs.map( (thumb, index) => (
              <Thumbnail thumb={thumb} key={index} index={index} handleChange={handleThumbChecked} />
            ))}
      </div>
      <button onClick={handleSubmit}>Submit</button>
    </div>
  );
}


export default Dashboard;


