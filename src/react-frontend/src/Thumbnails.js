import React, { useEffect, useState } from "react";

const Thumbnails = ({ image, croppedSizes, nonce, proxy }) => {
  const croppedSizesNames = croppedSizes.map((size) => size.name);
  const [cropHints, setCropHint] = useState({});

  const getCropHint = async (size, originalId, [width, height]) => {
    const reqUrl = `${proxy}?image=${originalId}&width=${width}&height=${height}&size=${size}`;
    console.log("reqURL", reqUrl);
    const response = await fetch(reqUrl, {
      headers: new Headers({ "X-WP-Nonce": nonce }),
    });
    console.log("response", response);
    const data = await response.json();
    const cropHint = data.responses[0].cropHintsAnnotation.cropHints[0];
    console.log("data", data);

    setCropHint(cropHints[size]);
  };

  const saveCrop = async (originalId, thumbUri) => {
    if (cropHints.length === 0) getCropHint();
    const newThumbUrl = await fetch(proxy, {
      headers: new Headers({ "X-WP-Nonce": nonce }),
    });
  };
  const thumbs = Object.entries(image.media_details.sizes).reduce(
    (acc, [size, details]) => {
      if (croppedSizesNames.includes(size)) {
        const thumb = details;
        thumb.name = size;
        acc.push(thumb);
      }
      return acc;
    },
    []
  );

  return (
    <div>
      <a href={image.link} target="_blank" rel="noopener noreferrer">
        <img src={image.media_details.sizes.medium.source_url} alt="" />
        {image.slug}
      </a>

      <ul>
        {thumbs.map((thumb) => (
          <li key={thumb.name}>
            <span>{thumb.name}</span>
            <img src={thumb.source_url} alt={thumb.name} />
            <button
              onClick={() =>
                getCropHint(thumb.name, image.id, [thumb.width, thumb.height])
              }
            >
              Preview Smart Crop
            </button>
            <button onClick={saveCrop}>
              Crop & <span>Overwrite</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default Thumbnails;
