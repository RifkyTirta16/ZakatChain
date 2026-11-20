interface EthereumLogoProps {
  size?: number;
  className?: string;
  monochrome?: boolean;
}

/**
 * Official geometric Ethereum diamond mark preserving the 256x417 proportions.
 */
export const EthereumLogo = ({ size = 16, className = '', monochrome = false }: EthereumLogoProps) => {
  const height = Math.round((size * 417) / 256);
  return (
    <svg
      width={size}
      height={height}
      viewBox="0 0 256 417"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      className={`shrink-0 ${className}`}
    >
      <path
        d="M127.961 0L125.166 9.5V285.168L127.961 287.958L255.923 212.32L127.961 0Z"
        fill={monochrome ? 'currentColor' : '#343434'}
        fillOpacity={monochrome ? 0.9 : 1}
      />
      <path
        d="M127.962 0L0 212.32L127.962 287.959V154.158V0Z"
        fill={monochrome ? 'currentColor' : '#8C8C8C'}
        fillOpacity={monochrome ? 0.65 : 1}
      />
      <path
        d="M127.961 312.187L126.386 314.107V412.306L127.961 416.905L255.999 236.587L127.961 312.187Z"
        fill={monochrome ? 'currentColor' : '#3C3C3B'}
        fillOpacity={monochrome ? 0.9 : 1}
      />
      <path
        d="M127.962 416.905V312.187L0 236.587L127.962 416.905Z"
        fill={monochrome ? 'currentColor' : '#8C8C8C'}
        fillOpacity={monochrome ? 0.65 : 1}
      />
      <path
        d="M127.961 287.958L255.923 212.32L127.961 154.159V287.958Z"
        fill={monochrome ? 'currentColor' : '#141414'}
        fillOpacity={monochrome ? 1 : 1}
      />
      <path
        d="M0 212.32L127.962 287.959V154.159L0 212.32Z"
        fill={monochrome ? 'currentColor' : '#393939'}
        fillOpacity={monochrome ? 0.78 : 1}
      />
    </svg>
  );
};
