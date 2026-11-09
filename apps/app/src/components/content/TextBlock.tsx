import { parseTextBlock } from "@spanglish/content";
export function TextBlock({ body }: { body: string }) {
  return <div className="space-y-4">{parseTextBlock(body).map((node, index) => node.type === "p"
    ? <p key={index}>{node.parts.map((part, partIndex) => part.bold ? <strong key={partIndex}>{part.text}</strong> : <span key={partIndex}>{part.text}</span>)}</p>
    : <ul key={index} className="list-disc pl-6">{node.items.map((item, itemIndex) => <li key={itemIndex}>{item.map((part, partIndex) => part.bold ? <strong key={partIndex}>{part.text}</strong> : <span key={partIndex}>{part.text}</span>)}</li>)}</ul>)}</div>;
}
