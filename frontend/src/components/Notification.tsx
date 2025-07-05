import { useRef } from "react";
import { Message } from "../../../schemas/messages";
import { useOnScreen } from "./Messages";

export default function Notification(props: { message: Message }) {
  const { message } = props;
  const ref = useRef<HTMLDivElement>(null);

  return (
    <div className="p-3 flex text-[#b6b6b6]" ref={ref}>
      <div className="w-[100%] text-center">
        <div className="overflow-wrap break-word italic">{message.content}</div>
      </div>
    </div>
  );
}
