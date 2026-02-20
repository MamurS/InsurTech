
import React, { createContext, useContext, useState, ReactNode } from 'react';

const PageHeaderContext = createContext<{
  headerActions: ReactNode;
  setHeaderActions: (actions: ReactNode) => void;
}>({ headerActions: null, setHeaderActions: () => {} });

export const PageHeaderProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [headerActions, setHeaderActions] = useState<ReactNode>(null);
  return (
    <PageHeaderContext.Provider value={{ headerActions, setHeaderActions }}>
      {children}
    </PageHeaderContext.Provider>
  );
};

export const usePageHeader = () => useContext(PageHeaderContext);
