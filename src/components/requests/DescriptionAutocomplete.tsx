import { useState, useRef, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Plus } from 'lucide-react';
import { useMaterialCatalog, useCreateCatalogItem, CatalogItem, normalizeText } from '@/hooks/useMaterialCatalog';

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
  placeholder = "Type to search items...",
}: DescriptionAutocompleteProps) {
  const { data: cloudCatalog = [] } = useMaterialCatalog();
  const createItem = useCreateCatalogItem();
  const catalog: SelectedMaterial[] = catalogOverride ?? cloudCatalog.map((c: CatalogItem) => ({
    itemCode: c.itemCode, description: c.description, uom: c.uom,
  }));

  const [isOpen, setIsOpen] = useState(false);
  const [suggestions, setSuggestions] = useState<SelectedMaterial[]>([]);
  const [noMatch, setNoMatch] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const runFilter = (inputValue: string) => {
    if (inputValue.length >= 1) {
      const lowerQuery = inputValue.toLowerCase();
      const filtered = catalog.filter(m =>
        m.description.toLowerCase().includes(lowerQuery) ||
        m.itemCode.toLowerCase().includes(lowerQuery)
      ).slice(0, 8);
      setSuggestions(filtered);
      const normalized = normalizeText(inputValue).toLowerCase();
      const exact = catalog.some(m => normalizeText(m.description).toLowerCase() === normalized);
      setNoMatch(!exact && normalized.length > 0);
      setIsOpen(true);
    } else {
      setSuggestions([]);
      setNoMatch(false);
      setIsOpen(false);
    }
  };

  const handleInputChange = (inputValue: string) => {
    onChange(inputValue);
    runFilter(inputValue);
  };

  const handleSelect = (material: SelectedMaterial) => {
    onSelect(material);
    setIsOpen(false);
    setSuggestions([]);
  };

  const handleAddNew = () => {
    const description = normalizeText(value);
    if (!description) return;
    createItem.mutate(
      { itemCode: '', description, uom: 'pcs' },
      {
        onSuccess: (data: any) => {
          handleSelect({
            itemCode: data.item_code || '',
            description: data.description,
            uom: data.uom || 'pcs',
          });
        },
      }
    );
  };

  return (
    <div ref={wrapperRef} className="relative">
      <Input
        value={value}
        onChange={(e) => handleInputChange(e.target.value)}
        onFocus={() => runFilter(value)}
        onBlur={() => onChange(normalizeText(value))}
        className="h-8"
        placeholder={placeholder}
      />
      {isOpen && (suggestions.length > 0 || noMatch) && (
        <div className="absolute z-50 w-full mt-1 bg-background border rounded-md shadow-lg max-h-60 overflow-y-auto">
          {suggestions.map((material, idx) => (
            <div
              key={`${material.itemCode}-${idx}`}
              className="px-3 py-2 hover:bg-accent cursor-pointer border-b last:border-b-0"
              onClick={() => handleSelect(material)}
            >
              <div className="text-sm">{material.description}</div>
              <div className="text-xs text-muted-foreground flex gap-2">
                <span>{material.itemCode}</span>
                <span>•</span>
                <span>{material.uom}</span>
              </div>
            </div>
          ))}
          {noMatch && !catalogOverride && (
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={handleAddNew}
              disabled={createItem.isPending}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-primary hover:bg-accent border-t bg-muted/30"
            >
              <Plus className="h-4 w-4" />
              Add "{normalizeText(value)}" to catalog
            </button>
          )}
        </div>
      )}
    </div>
  );
}
