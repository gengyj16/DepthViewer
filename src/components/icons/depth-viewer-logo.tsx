import type { SVGProps } from 'react';

export function DepthViewerLogo(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 100 40"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-label="DepthViewer Logo"
      {...props}
    >
      <path d="M10 30 L10 10 L20 10 L20 20 L30 20 L30 10 L40 10 L40 30 L30 30 L30 20 L20 20 L20 30 Z" strokeWidth="3" />
      <path d="M50 30 Q60 5, 70 30 M50 30 Q60 55, 70 30" strokeWidth="3" />
      <path d="M50 10 L70 10" strokeWidth="2" opacity="0.5"/>
      <path d="M50 20 L70 20" strokeWidth="2" opacity="0.7"/>
       <style jsx>{`
        svg path {
          stroke: hsl(var(--primary));
        }
      `}</style>
    </svg>
  );
}
