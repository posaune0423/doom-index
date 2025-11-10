import type { FC, SVGProps } from "react";

export const XIcon: FC<SVGProps<SVGSVGElement>> = ({ className, ...props }) => {
  return (
    <svg aria-hidden="true" focusable="false" viewBox="0 0 24 24" fill="currentColor" className={className} {...props}>
      <path d="M18.244 2H22L13.98 10.982 23 22h-6.708l-4.986-6.125L5.64 22H2l8.492-9.077L2 2h6.83l4.492 5.633L18.244 2Zm-1.19 18.335h1.885L7.034 3.58H5.027l12.026 16.755Z" />
    </svg>
  );
};
