import { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Input } from '@/components/ui/input';
import { PackageSearch } from 'lucide-react';
import { useMaterialCatalog, CatalogItem } from '@/hooks/useMaterialCatalog';

export interface SelectedMaterial {
  itemCode: string;
  description: string;
  uom: string;
}

interface DescriptionAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  onSelect: (material: SelectedMaterial) => void;
  /** Optional override – when omitted the cloud catalog is used */
  catalog?: SelectedMaterial[];
  placeholder?: string;
}

export function DescriptionAutocomplete({
  value,
  onChange,
  onSelect,
  catalog: catalogOverride,
  placeholder = "Search by description or item code...",
}: DescriptionAutocompleteProps) {
  const { data: cloudCatalog = [] } = useMaterialCatalog();
  const catalog: SelectedMaterial[] = catalogOverride ?? cloudCatalog.map((c: CatalogItem) => ({
    itemCode: c.itemCode, description: c.description, uom: c.uom,
  }));

  const [query, setQuery] = useState(value);
  const [isOpen, setIsOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => { setQuery(value); }, [value]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const q = query.trim().toLowerCase();
  const suggestions = q.length === 0
    ? catalog.slice(0, 20)
    : catalog.filter(m =>
        m.description.toLowerCase().includes(q) ||
        m.itemCode.toLowerCase().includes(q)
      ).slice(0, 20);

  const handleSelect = (material: SelectedMaterial) => {
    onSelect(material);
    setQuery(material.description);
    setIsOpen(false);
  };

  const handleQueryChange = (next: string) => {
    setQuery(next);
    setIsOpen(true);
    const trimmed = next.trim().toLowerCase();
    if (!trimmed) return;
    // Auto-select on exact item code or exact description match
    const exact = catalog.find(
      m =>
        m.itemCode.toLowerCase() === trimmed ||
        m.description.toLowerCase() === trimmed
    );
    if (exact) {
      onSelect(exact);
      setQuery(exact.description);
    }
  };

  return (
    <div ref={wrapperRef} className="relative">
      <Input
        value={query}
        onChange={(e) => handleQueryChange(e.target.value)}
        onFocus={() => setIsOpen(true)}
        className="h-8"
        placeholder={placeholder}
      />
      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-background border rounded-md shadow-lg max-h-60 overflow-y-auto">
          {suggestions.length > 0 ? (
            suggestions.map((material, idx) => (
              <div
                key={`${material.itemCode}-${idx}`}
                className="px-3 py-2 hover:bg-accent cursor-pointer border-b last:border-b-0"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => handleSelect(material)}
              >
                <div className="text-sm">{material.description}</div>
                <div className="text-xs text-muted-foreground flex gap-2">
                  <span>{material.itemCode}</span>
                  <span>•</span>
                  <span>{material.uom}</span>
                </div>
              </div>
            ))
          ) : (
            <div className="px-3 py-3 text-sm text-muted-foreground flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <PackageSearch className="h-4 w-4" />
                <span>Item not found.</span>
              </div>
              <Link
                to="/items"
                className="text-primary hover:underline text-xs"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => setIsOpen(false)}
              >
                Add it in Item List first →
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
