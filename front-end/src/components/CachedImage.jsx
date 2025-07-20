import React from 'react';
import useCachedIcon from '../hooks/useCachedIcon.js';

export default function CachedImage({ src, ...props }) {
  const url = useCachedIcon(src);
  return <img src={url} {...props} />;
}
