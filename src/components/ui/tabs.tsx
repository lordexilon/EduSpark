import * as React from 'react';

const TabsContext = React.createContext<{
  value: string;
  onValueChange: (value: string) => void;
} | null>(null);

const Tabs = ({ defaultValue, value, onValueChange, children, className }: any) => {
  const [activeTab, setActiveTab] = React.useState(value || defaultValue);

  React.useEffect(() => {
    if (value) setActiveTab(value);
  }, [value]);

  const handleValueChange = (newValue: string) => {
    if (!value) setActiveTab(newValue);
    onValueChange?.(newValue);
  };

  return (
    <TabsContext.Provider value={{ value: activeTab, onValueChange: handleValueChange }}>
      <div className={className}>{children}</div>
    </TabsContext.Provider>
  );
};

const TabsList = ({ children, className }: any) => (
  <div
    className={`inline-flex h-9 items-center justify-center rounded-lg bg-muted p-1 text-muted-foreground ${className}`}
  >
    {children}
  </div>
);

const TabsTrigger = ({ value, children, className }: any) => {
  const context = React.useContext(TabsContext);
  if (!context) return null;
  const isActive = context.value === value;

  return (
    <button
      onClick={() => context.onValueChange(value)}
      className={`inline-flex items-center justify-center white-space-nowrap rounded-md px-3 py-1 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 ${
        isActive ? 'bg-background text-foreground shadow' : ''
      } ${className}`}
    >
      {children}
    </button>
  );
};

const TabsContent = ({ value, children, className }: any) => {
  const context = React.useContext(TabsContext);
  if (!context || context.value !== value) return null;

  return (
    <div
      className={`mt-2 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${className}`}
    >
      {children}
    </div>
  );
};

export { Tabs, TabsList, TabsTrigger, TabsContent };
