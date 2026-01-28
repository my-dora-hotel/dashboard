'use client';
import { useEffect, useId, useMemo } from 'react';
import {
  MotionValue,
  motion,
  useSpring,
  useTransform,
  motionValue,
} from 'motion/react';
import useMeasure from 'react-use-measure';

const TRANSITION = {
  type: 'spring' as const,
  stiffness: 150,
  damping: 25,
  mass: 0.5,
};

function AnimatedDigit({ digit }: { digit: number }) {
  const initial = motionValue(0);
  const animatedValue = useSpring(initial, TRANSITION);

  useEffect(() => {
    animatedValue.set(digit);
  }, [animatedValue, digit]);

  return (
    <div className='relative inline-block w-[1ch] overflow-x-visible overflow-y-clip leading-none tabular-nums'>
      <div className='invisible'>0</div>
      {Array.from({ length: 10 }, (_, i) => (
        <NumberSlot key={i} mv={animatedValue} number={i} />
      ))}
    </div>
  );
}

function NumberSlot({ mv, number }: { mv: MotionValue<number>; number: number }) {
  const uniqueId = useId();
  const [ref, bounds] = useMeasure();

  const y = useTransform(mv, (latest) => {
    if (!bounds.height) return 0;
    const placeValue = latest % 10;
    const offset = (10 + number - placeValue) % 10;
    let memo = offset * bounds.height;

    if (offset > 5) {
      memo -= 10 * bounds.height;
    }

    return memo;
  });

  // don't render the animated number until we know the height
  if (!bounds.height) {
    return (
      <span ref={ref} className='invisible absolute'>
        {number}
      </span>
    );
  }

  return (
    <motion.span
      style={{ y }}
      layoutId={`${uniqueId}-${number}`}
      className='absolute inset-0 flex items-center justify-center'
      transition={TRANSITION}
      ref={ref}
    >
      {number}
    </motion.span>
  );
}

type SlidingNumberProps = {
  value: number;
  locale?: string;
  minimumFractionDigits?: number;
  maximumFractionDigits?: number;
};

export function SlidingNumber({
  value,
  locale = 'tr-TR',
  minimumFractionDigits = 0,
  maximumFractionDigits = 2,
}: SlidingNumberProps) {
  // Use Intl.NumberFormat for consistent formatting across the app
  const formattedParts = useMemo(() => {
    const formatter = new Intl.NumberFormat(locale, {
      minimumFractionDigits,
      maximumFractionDigits,
      useGrouping: true,
    });
    
    return formatter.formatToParts(Math.abs(value));
  }, [value, locale, minimumFractionDigits, maximumFractionDigits]);

  // Track digit indices for animation (integer and fraction separately)
  let integerDigitIndex = 0;
  let fractionDigitIndex = 0;
  
  // Count total integer and fraction digits for place calculation
  const integerDigits = formattedParts
    .filter(part => part.type === 'integer')
    .map(part => part.value)
    .join('');
  
  const fractionDigits = formattedParts
    .filter(part => part.type === 'fraction')
    .map(part => part.value)
    .join('');

  return (
    <div className='flex items-center'>
      {value < 0 && <span>-</span>}
      {formattedParts.map((part, partIndex) => {
        if (part.type === 'integer') {
          // Render each digit in the integer part with animation
          return part.value.split('').map((char, charIndex) => {
            const digitIndex = integerDigitIndex++;
            const place = Math.pow(10, integerDigits.length - digitIndex - 1);
            return (
              <AnimatedDigit
                key={`int-${partIndex}-${charIndex}-${place}`}
                digit={Math.floor(parseInt(integerDigits, 10) / place) % 10}
              />
            );
          });
        }
        
        if (part.type === 'fraction') {
          // Render each digit in the fraction part with animation
          return part.value.split('').map((char, charIndex) => {
            const digitIndex = fractionDigitIndex++;
            const fractionValue = parseInt(fractionDigits, 10);
            const place = Math.pow(10, fractionDigits.length - digitIndex - 1);
            return (
              <AnimatedDigit
                key={`frac-${partIndex}-${charIndex}-${place}`}
                digit={Math.floor(fractionValue / place) % 10}
              />
            );
          });
        }
        
        // For group separators (.), decimal separators (,), etc. - render as static text
        if (part.type === 'group' || part.type === 'decimal') {
          return <span key={`sep-${partIndex}`}>{part.value}</span>;
        }
        
        return null;
      })}
    </div>
  );
}
