import { useEffect, useRef } from "react";
export default function Modal({ title, onClose, children }) {
  const ref = useRef(null);
  useEffect(() => {
    const dialog = ref.current;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    dialog.showModal();
    const close = (event) => {
      event.preventDefault();
      onClose();
    };
    dialog.addEventListener("cancel", close);
    return () => {
      dialog.removeEventListener("cancel", close);
      if (dialog.open) dialog.close();
      document.body.style.overflow = previousOverflow;
    };
  }, [onClose]);
  useEffect(() => {
    if (ref.current) ref.current.scrollTop = 0;
  }, [title]);
  return (
    <dialog ref={ref} className="yv-dialog" aria-labelledby="yv-modal-title">
      <div className="yv-dialog-header">
        <button className="yv-dialog-back" type="button" aria-label="Retour" title="Retour au site" onClick={onClose}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 12H4m7-7-7 7 7 7"/></svg></button>
        <h2 id="yv-modal-title">{title}</h2>
        <button type="button" aria-label="Fermer" onClick={onClose}>
          ×
        </button>
      </div>
      <div className="yv-dialog-content">{children}</div>
    </dialog>
  );
}
