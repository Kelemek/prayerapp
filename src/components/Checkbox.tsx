import React from 'react';

interface CheckboxProps extends React.InputHTMLAttributes<HTMLInputElement> {
  boxClassName?: string;
  checkClassName?: string;
  children?: React.ReactNode;
  wrapperClassName?: string;
}

const Checkbox: React.FC<CheckboxProps> = ({
  checked,
  onChange,
  id,
  name,
  disabled,
  boxClassName,
  checkClassName,
  children,
  wrapperClassName,
  ...rest
}) => {
  return (
    <label className={`flex items-center ${wrapperClassName || ''}`}>
      <input
        id={id}
        name={name}
        type="checkbox"
        checked={checked}
        onChange={onChange}
        disabled={disabled}
        className="sr-only"
        {...rest}
      />

      <span
        className={`inline-block h-4 w-4 rounded-sm border-2 flex items-center justify-center flex-none transition-colors ${
          boxClassName || 'border-gray-300 bg-white dark:bg-gray-800'
        }`}
        aria-hidden
      >
        {checked && (
          <svg
            className={`${checkClassName || 'text-blue-600'} text-opacity-100 dark:text-opacity-100 filter drop-shadow-sm w-3 h-3`}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={3.5}
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <polyline points="20 6 9 17 4 12" />
          </svg>
        )}
      </span>

      {children ? <div className="ml-2">{children}</div> : null}
    </label>
  );
};

export default Checkbox;
