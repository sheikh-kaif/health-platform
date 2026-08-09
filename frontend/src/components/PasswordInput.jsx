import { useState } from "react";
import { IconEye, IconEyeOff } from "./SidebarIcons";

export default function PasswordInput({
  className = "",
  inputClassName = "",
  ...props
}) {
  const [visible, setVisible] = useState(false);

  return (
    <div className={`relative ${className}`}>
      <input
        {...props}
        type={visible ? "text" : "password"}
        className={`w-full pr-10 ${inputClassName}`}
      />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        tabIndex={-1}
        className="absolute inset-y-0 right-0 flex w-10 items-center justify-center text-ink-400 hover:text-ink-600"
        aria-label={visible ? "Hide password" : "Show password"}
        title={visible ? "Hide password" : "Show password"}
      >
        {visible ? (
          <IconEyeOff width={17} height={17} />
        ) : (
          <IconEye width={17} height={17} />
        )}
      </button>
    </div>
  );
}
