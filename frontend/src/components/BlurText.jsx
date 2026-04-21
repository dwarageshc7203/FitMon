import { createElement, useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'motion/react';

const getDirectionalOffset = (direction) => {
  switch (direction) {
    case 'bottom':
      return { y: 24 };
    case 'left':
      return { x: -24 };
    case 'right':
      return { x: 24 };
    default:
      return { y: -24 };
  }
};

export default function BlurText({
  text = '',
  delay = 120,
  className = '',
  animateBy = 'words',
  direction = 'top',
  threshold = 0.15,
  rootMargin = '0px',
  onAnimationComplete,
  stepDuration = 0.35,
}) {
  const ref = useRef(null);
  const [inView, setInView] = useState(false);
  const elements = useMemo(
    () => (animateBy === 'words' ? text.split(' ') : text.split('')),
    [animateBy, text],
  );

  useEffect(() => {
    const node = ref.current;
    if (!node) return undefined;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          observer.disconnect();
        }
      },
      { threshold, rootMargin },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [threshold, rootMargin]);

  const offset = getDirectionalOffset(direction);

  return (
    <div ref={ref} className={className} aria-label={text}>
      {elements.map((segment, index) =>
        createElement(
          motion.span,
          {
            key: `${segment}-${index}`,
            initial: {
              opacity: 0,
              filter: 'blur(10px)',
              ...offset,
            },
            animate: inView
              ? {
                  opacity: 1,
                  filter: 'blur(0px)',
                  x: 0,
                  y: 0,
                }
              : undefined,
            transition: {
              duration: stepDuration,
              delay: (delay / 1000) * index,
              ease: [0.22, 1, 0.36, 1],
            },
            onAnimationComplete: index === elements.length - 1 ? onAnimationComplete : undefined,
            style: { display: 'inline-block', whiteSpace: 'pre' },
          },
          `${segment}${animateBy === 'words' ? ' ' : ''}`,
        ),
      )}
    </div>
  );
}
