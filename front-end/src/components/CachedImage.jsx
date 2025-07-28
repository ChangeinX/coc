import React from 'react';
import useCachedIcon from '../hooks/useCachedIcon.js';

export default function CachedImage({ src, strategy = 'indexed', ...props }) {
  const url = useCachedIcon(src, strategy);
  return <img src={url} {...props} />;
}
