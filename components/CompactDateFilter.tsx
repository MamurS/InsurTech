
import React from 'react';
import DatePicker from 'react-datepicker';
import { getStoredDateFormat } from '../utils/dateUtils';

const getPickerFormat = (): string => {
    const appFormat = getStoredDateFormat();
    const formatMap: Record<string, string> = {
        'dd.mm.yyyy': 'dd.MM.yyyy',
        'dd/mm/yyyy': 'dd/MM/yyyy',
        'mm/dd/yyyy': 'MM/dd/yyyy',
        'mm.dd.yyyy': 'MM.dd.yyyy',
        'dd-mm-yyyy': 'dd-MM-yyyy',
        'mm-dd-yyyy': 'MM-dd-yyyy'
    };
    return formatMap[appFormat] || 'dd.MM.yyyy';
};

interface Props {
    value: Date | null;
    onChange: (date: Date | null) => void;
    placeholder?: string;
}

export const CompactDateFilter: React.FC<Props> = ({ value, onChange, placeholder = 'dd.mm.yyyy' }) => {
    const format = getPickerFormat();
    return (
        <div style={{ width: '110px' }} className="flex-shrink-0">
            <DatePicker
                selected={value}
                onChange={onChange}
                dateFormat={format}
                placeholderText={placeholder}
                className="w-full px-1.5 py-1 text-xs bg-white border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 text-gray-700"
                showMonthDropdown
                showYearDropdown
                dropdownMode="select"
                autoComplete="off"
                popperProps={{ strategy: 'fixed' }}
                isClearable
            />
        </div>
    );
};
