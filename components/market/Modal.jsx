import { useEffect, useRef } from "react";
export default function Modal({ title, onClose, children }) {
  const ref = useRef(null);
  useEffect(() => {
    const dialog = ref.current;
    dialog.showModal();
    const close = (event) => {
      event.preventDefault();
      onClose();
    };
    dialog.addEventListener("cancel", close);
    return () => {
      dialog.removeEventListener("cancel", close);
      if (dialog.open) dialog.close();
    };
  }, [onClose]);
  return (
    <dialog ref={ref} className="yv-dialog" aria-labelledby="yv-modal-title">
      <div className="yv-dialog-header">
        <h2 id="yv-modal-title">{title}</h2>
        <button type="button" aria-label="Fermer" onClick={onClose}>
          ×
        </button>
      </div>
      <div className="yv-dialog-content">{children}</div>
    </dialog>
  );
}
