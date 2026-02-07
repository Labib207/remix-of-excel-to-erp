import { useState, useRef, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { MaterialCatalog } from '@/store/requirementStore';

interface DescriptionAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  onSelect: (material: MaterialCatalog) => void;
  catalog: MaterialCatalog[];
  placeholder?: string;
}

export function DescriptionAutocomplete({
  value,
  onChange,
  onSelect,
  catalog,
  placeholder = "Type to search materials..."
}: DescriptionAutocompleteProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [suggestions, setSuggestions] = useState<MaterialCatalog[]>([]);
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

  const handleInputChange = (inputValue: string) => {
    onChange(inputValue);
    
    if (inputValue.length >= 2) {
      const lowerQuery = inputValue.toLowerCase();
      const filtered = catalog.filter(m =>
        m.description.toLowerCase().includes(lowerQuery) ||
        m.itemCode.toLowerCase().includes(lowerQuery)
      ).slice(0, 8);
      setSuggestions(filtered);
      setIsOpen(filtered.length > 0);
    } else {
      setSuggestions([]);
      setIsOpen(false);
    }
  };

  const handleSelect = (material: MaterialCatalog) => {
    onSelect(material);
    setIsOpen(false);
    setSuggestions([]);
  };

  return (
    <div ref={wrapperRef} className="relative">
      <Input
        value={value}
        onChange={(e) => handleInputChange(e.target.value)}
        onFocus={() => {
          if (value.length >= 2 && suggestions.length > 0) {
            setIsOpen(true);
          }
        }}
        className="h-8"
        placeholder={placeholder}
      />
      {isOpen && suggestions.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-background border rounded-md shadow-lg max-h-60 overflow-y-auto">
          {suggestions.map((material, idx) => (
            <div
              key={`${material.itemCode}-${idx}`}
              className="px-3 py-2 hover:bg-accent cursor-pointer border-b last:border-b-0"
              onClick={() => handleSelect(material)}
            >
              <div className="font-medium text-sm">{material.description}</div>
              <div className="text-xs text-muted-foreground flex gap-2">
                <span>{material.itemCode}</span>
                <span>•</span>
                <span>{material.uom}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
