import { createElement } from "react";
export default function InfoContent({ content }) {
  function render(node, key) {
    if (typeof node === "string") return node;
    return createElement(
      node.tag,
      { ...node.props, key },
      ...node.children.map((c, i) => render(c, i)),
    );
  }
  return <>{content.map((node, i) => render(node, i))}</>;
}
