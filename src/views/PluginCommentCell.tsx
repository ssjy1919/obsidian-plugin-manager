import { useEffect, useRef } from "react";
import { useSelector } from "react-redux";
import { Component, MarkdownRenderer, Notice } from "obsidian";
import { RootState } from "../store";
import { PluginManager } from "../types";
import PluginManagerPlugin from "../main";
import { t } from "../i18n";

interface Props {
    plugin: PluginManagerPlugin;
    Iplugin: PluginManager;
    editing: boolean;
    value: string;
    placeholder: string;
    onChange: (v: string) => void;
    onEdit: () => void;
    onBlur: () => void;
}

const PluginCommentCell: React.FC<Props> = ({
    plugin, Iplugin, editing, value, placeholder, onChange, onEdit, onBlur
}) => {
    const divRef = useRef<HTMLDivElement>(null);
    const renderComponentRef = useRef<Component | null>(null);
    const language = useSelector((state: RootState) => state.settings.language);

    useEffect(() => {
        const component = new Component();
        renderComponentRef.current = component;
        return () => component.unload();
    }, []);

    useEffect(() => {
        if (!editing && divRef.current && renderComponentRef.current) {
            divRef.current.innerHTML = "";
            MarkdownRenderer.render(
                plugin.app,
                value === "" ? placeholder : value,
                divRef.current,
                "",
                renderComponentRef.current
            ).then(() => {
                // 处理内部链接
                divRef.current?.querySelectorAll('a.internal-link').forEach(a => {
                    a.addEventListener('click', async (evt) => {
                        evt.stopPropagation();
                        const href = a.getAttribute('href') as string;
                        const files = plugin.app.vault.getMarkdownFiles();
                        const matches = files.filter(f => {
                            const filePath = f.path.replace(/\.md$/, '');
                            return filePath === href || f.name.replace(/\.md$/, '') === href;
                        });
                        if (matches.length > 1) {
                            new Notice(t(language, "multipleNotes", { name: href }));
                        } if (matches.length === 0)
                            new Notice(t(language, "noteNotFound", { name: href }));
                        await plugin.app.workspace.openLinkText(href, '', false);
                    });
                });

            });
        }
    }, [editing, value, placeholder, plugin, language]);
    if (editing) {
        return (
            <textarea
                value={value}
                placeholder={placeholder}
                rows={2}
                onChange={e => onChange(e.target.value)}
                onBlur={onBlur}
                autoFocus
            />
        );
    }
    return (
        <div
            className="markdown-rendered"
            ref={divRef}
            onClick={e => {
                if (!(e.target instanceof HTMLElement && e.target.closest('a'))) {
                    onEdit();
                }
            }}
        />
    );
};

export default PluginCommentCell;
