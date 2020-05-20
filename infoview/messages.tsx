import { basename, escapeHtml, colorizeMessage } from './util';
import { Message } from 'lean-client-js-node';
import React = require('react');
import { Location, DisplayMode } from '../src/typings';
import { MessagesContext, ConfigContext } from '.';
import { DefaultSerializer } from 'v8';

function compareMessages(m1: Message, m2: Message): boolean {
    return (m1.file_name === m2.file_name &&
        m1.pos_line === m2.pos_line && m1.pos_col === m2.pos_col &&
        m1.severity === m2.severity && m1.caption === m2.caption && m1.text === m2.text);
}

export function MessageView(m: Message) {
    // const f = escapeHtml(m.file_name);
    const b = escapeHtml(basename(m.file_name));
    const l = m.pos_line; const c = m.pos_col;
    // const el = m.end_pos_line || l;
    // const ec = m.end_pos_col || c;
    // const cmd = encodeURI('command:_lean.revealPosition?' +
        // JSON.stringify([Uri.file(m.file_name), m.pos_line, m.pos_col]));
        // JSON.stringify([(m.file_name), m.pos_line, m.pos_col])); // [TODO] Uri.file isn't available in the webview?
    const shouldColorize = m.severity === 'error';
    let text = escapeHtml(m.text)
    text = shouldColorize ? colorizeMessage(text) : text;
    const title = `${b}:${l}:${c}`;
    return <details open>
        <summary className={m.severity + ' mv2'}>{title}</summary>
        <div className="ml3">
            <pre className="font-code" style={{whiteSpace: 'pre-wrap'}} dangerouslySetInnerHTML={{ __html: text }} />
        </div>
    </details>
}

export function Messages(props: {messages: Message[]; title?: string, defaultOpen?: boolean}): JSX.Element {
    if (!props.messages || props.messages.length === 0) { return null; }
    const msgs = (props.messages || []).map(m =>
      <MessageView {...m} key={m.file_name + m.pos_line + m.pos_col + m.caption}/>);
    return  <details open={props.defaultOpen === undefined ? true : props.defaultOpen}>
        <summary className="mv2">{props.title || 'Messages'}</summary>
        <div className="ml3">
            {msgs}
        </div>
    </details>
}

interface MessagesForProps {
    loc: Location;
}

export function AllMessages(props: {file_name?: string}) {
    const allMessages = React.useContext(MessagesContext);
    const msgs = allMessages
    .filter((m) => props.file_name ? m.file_name === props.file_name : true)
    .sort((a, b) => a.pos_line === b.pos_line
        ? a.pos_col - b.pos_col
        : a.pos_line - b.pos_line);
    return <Messages title="All Messages" messages={msgs}/>
}

export function MessagesFor(props: MessagesForProps) {
    const allMessages = React.useContext(MessagesContext);
    const config = React.useContext(ConfigContext);
    const loc = props.loc;
    let msgs: Message[];
    /* Heuristic: find first position to the left which has messages attached,
        from that on show all messages in this line */
    msgs = allMessages
        .filter((m) => m.file_name === loc.file_name &&
            m.pos_line === loc.line)
        .sort((a, b) => a.pos_col - b.pos_col);
    if (!config.infoViewAllErrorsOnLine) {
        let startColumn;
        let startPos = null;
        for (let i = 0; i < msgs.length; i++) {
            if (loc.column < msgs[i].pos_col) { break; }
            if (loc.column === msgs[i].pos_col) {
                startColumn = loc.column;
                startPos = i;
                break;
            }
            if (startColumn == null || startColumn < msgs[i].pos_col) {
                startColumn = msgs[i].pos_col;
                startPos = i;
            }
        }
        if (startPos) {
            msgs = msgs.slice(startPos);
        }
    }
    return <Messages messages={msgs}/>
}