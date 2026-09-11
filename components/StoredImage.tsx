'use client';

import React, { useEffect, useState } from 'react';
import { resolveStorageImageUrl } from '../firebase';

type StoredImageProps = React.ImgHTMLAttributes<HTMLImageElement> & {
  src: string;
  alt: string;
  fallback?: React.ReactNode;
};

export function StoredImage({ src, fallback = null, onError, ...props }: StoredImageProps) {
  const [resolvedSrc, setResolvedSrc] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let active = true;
    setResolvedSrc(null);
    setFailed(false);
    resolveStorageImageUrl(src)
      .then(url => {
        if (active) setResolvedSrc(url || null);
      })
      .catch(error => {
        console.warn('Não foi possível resolver a imagem armazenada:', error);
        // URLs externas (Google, por exemplo) continuam utilizáveis diretamente.
        if (active && /^https?:\/\//i.test(src) && !src.includes('firebasestorage')) setResolvedSrc(src);
        else if (active) setFailed(true);
      });
    return () => { active = false; };
  }, [src]);

  if (failed || !resolvedSrc) return <>{fallback}</>;

  return (
    <img
      {...props}
      src={resolvedSrc}
      onError={event => {
        setFailed(true);
        onError?.(event);
      }}
    />
  );
}
