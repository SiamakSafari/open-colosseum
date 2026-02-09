export type ArenaIconType = 'roast' | 'hottake' | 'chess' | 'underground' | 'debate';

interface ArenaIconProps {
  type: ArenaIconType;
  size?: number;
  className?: string;
}

export default function ArenaIcon({ type, size = 24, className = '' }: ArenaIconProps) {
  const props = {
    width: size,
    height: size,
    viewBox: '0 0 24 24',
    fill: 'currentColor',
    className,
    'aria-hidden': true as const,
  };

  switch (type) {
    case 'roast':
      // Crossed swords with flame
      return (
        <svg {...props}>
          <path d="M7.5 2L8.5 7L6 9.5L4.5 8L3 9.5L5 11.5L3.5 13L2 14.5L4.5 14L6.5 12L9 14.5L7 16.5L8.5 18L10.5 16L12 17.5L14 15.5L11.5 13L14 10.5L15.5 9L8.5 2H7.5Z" />
          <path d="M16.5 2L15.5 7L18 9.5L19.5 8L21 9.5L19 11.5L20.5 13L22 14.5L19.5 14L17.5 12L15 14.5L17 16.5L15.5 18L13.5 16L12 17.5L10 15.5L12.5 13L10 10.5L8.5 9L15.5 2H16.5Z" />
          <path d="M12 3C12 3 10.5 5.5 10.5 7C10.5 8.38 11.12 9 12 9C12.88 9 13.5 8.38 13.5 7C13.5 5.5 12 3 12 3Z" opacity="0.7" />
        </svg>
      );

    case 'hottake':
      // Spartan helmet front view
      return (
        <svg {...props}>
          <path d="M4 10C4 5.58 7.58 2 12 2C16.42 2 20 5.58 20 10V13C20 13 19 13.5 18 14V10C18 6.69 15.31 4 12 4C8.69 4 6 6.69 6 10V14C5 13.5 4 13 4 13V10Z" />
          <path d="M6 14V18C6 18 7 20 8 21H10C9 20 8 18.5 8 17V15.5L6 14Z" />
          <path d="M18 14V18C18 18 17 20 16 21H14C15 20 16 18.5 16 17V15.5L18 14Z" />
          <path d="M10 8H14V10H13V18H11V10H10V8Z" />
          <path d="M9 4.5C9 4.5 10 3 12 3C14 3 15 4.5 15 4.5L14 2.5C14 2.5 13.2 1.5 12 1.5C10.8 1.5 10 2.5 10 2.5L9 4.5Z" />
          <path d="M11 1.5H13V4H11V1.5Z" />
        </svg>
      );

    case 'chess':
      // Shield with knight piece
      return (
        <svg {...props}>
          <path d="M12 2L3 6V12C3 17.25 6.75 21.5 12 22.5C17.25 21.5 21 17.25 21 12V6L12 2ZM19 12C19 16.17 16.17 19.82 12 20.92C7.83 19.82 5 16.17 5 12V7.3L12 4.19L19 7.3V12Z" />
          <path d="M10 7L9 8.5L10.5 9L9 11L8 10.5V14L10 16H14L16 14V10.5L15 11L13.5 9L15 8.5L14 7H10ZM10.5 14V12.5L12 11L13.5 12.5V14H10.5Z" />
        </svg>
      );

    case 'underground':
      // Skull with mohawk crest
      return (
        <svg {...props}>
          <path d="M12 2C7.58 2 4 5.58 4 10C4 12.5 5.2 14.7 7 16V19H9V20H11V19H13V20H15V19H17V16C18.8 14.7 20 12.5 20 10C20 5.58 16.42 2 12 2ZM9 15C8.17 15 7.5 14.33 7.5 13.5C7.5 12.67 8.17 12 9 12C9.83 12 10.5 12.67 10.5 13.5C10.5 14.33 9.83 15 9 15ZM15 15C14.17 15 13.5 14.33 13.5 13.5C13.5 12.67 14.17 12 15 12C15.83 12 16.5 12.67 16.5 13.5C16.5 14.33 15.83 15 15 15ZM13 18H11V16.5L10.5 16H13.5L13 16.5V18Z" />
          <path d="M10 2.5V5H9V2.8C9.6 2.5 10 2.5 10 2.5Z" />
          <path d="M11 1.5V5H10.5V2L11 1.5Z" />
          <path d="M12 1V5.5H11.5V1.5L12 1Z" />
          <path d="M13 1.5V5H12.5V1.5L13 1.5Z" />
          <path d="M14 2.5V5H13.5V2L14 2.5Z" />
          <path d="M15 2.8V5H14.5V2.5C14.5 2.5 14.4 2.5 15 2.8Z" />
        </svg>
      );

    case 'debate':
      // Classical columns/podium
      return (
        <svg {...props}>
          <path d="M4 4H20V6H4V4Z" />
          <path d="M5 6H7V18H5V6Z" />
          <path d="M9 6H11V18H9V6Z" />
          <path d="M13 6H15V18H13V6Z" />
          <path d="M17 6H19V18H17V6Z" />
          <path d="M3 18H21V20H3V18Z" />
          <path d="M5 2H19V4H5V2Z" />
          <path d="M2 20H22V22H2V20Z" />
        </svg>
      );
  }
}
