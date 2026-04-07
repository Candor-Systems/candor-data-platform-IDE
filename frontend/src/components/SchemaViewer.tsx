// components/SchemaViewer.tsx
import React from 'react';
import { Table, Collapse, Tag } from 'antd';
import { Database, Table as TableIcon, Key, Link } from 'lucide-react';

const { Panel } = Collapse;

interface SchemaViewerProps {
  schema: {
    tables: {
      tableName: string;
      columns: {
        name: string;
        type: string;
        isNullable: boolean;
        defaultValue?: string;
      }[];
      primaryKeys: string[];
      foreignKeys: {
        columnName: string;
        foreignTableName: string;
        foreignColumnName: string;
      }[];
    }[];
    relationships?: any[];
  };
  onSelectTable?: (tableName: string) => void;
}

const SchemaViewer: React.FC<SchemaViewerProps> = ({ schema, onSelectTable }) => {
  const columns = [
    {
      title: 'Column',
      dataIndex: 'name',
      key: 'name',
      render: (text: string, record: any) => (
        <div className="flex items-center">
          {record.isPrimary && <Key className="h-3 w-3 mr-2 text-yellow-500" />}
          {record.isForeignKey && <Link className="h-3 w-3 mr-2 text-blue-500" />}
          <span>{text}</span>
        </div>
      ),
    },
    {
      title: 'Type',
      dataIndex: 'type',
      key: 'type',
    },
    {
      title: 'Nullable',
      dataIndex: 'isNullable',
      key: 'isNullable',
      render: (nullable: boolean) => (
        <Tag color={nullable ? 'orange' : 'green'}>
          {nullable ? 'YES' : 'NO'}
        </Tag>
      ),
    },
    {
      title: 'Default',
      dataIndex: 'defaultValue',
      key: 'defaultValue',
      render: (value: string) => value || '-',
    },
  ];

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      <Collapse accordion bordered={false} className="schema-collapse">
        {schema.tables.map((table) => (
          <Panel
            key={table.tableName}
            header={
              <div className="flex items-center">
                <TableIcon className="h-4 w-4 mr-2 text-primary-600" />
                <span className="font-medium">{table.tableName}</span>
                {table.primaryKeys.length > 0 && (
                  <Tag color="gold" className="ml-2">
                    {table.primaryKeys.length} PK
                  </Tag>
                )}
                {table.foreignKeys.length > 0 && (
                  <Tag color="blue" className="ml-2">
                    {table.foreignKeys.length} FK
                  </Tag>
                )}
              </div>
            }
          >
            <Table
              columns={columns}
              dataSource={table.columns.map(col => ({
                ...col,
                isPrimary: table.primaryKeys.includes(col.name),
                isForeignKey: table.foreignKeys.some(fk => fk.columnName === col.name),
                key: col.name,
              }))}
              pagination={false}
              size="small"
              bordered
            />
            {table.foreignKeys.length > 0 && (
              <div className="mt-4">
                <h4 className="font-medium mb-2">Foreign Keys:</h4>
                <ul className="list-disc pl-5">
                  {table.foreignKeys.map((fk, i) => (
                    <li key={i}>
                      {fk.columnName} → {fk.foreignTableName}.{fk.foreignColumnName}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </Panel>
        ))}
      </Collapse>
    </div>
  );
};

export default SchemaViewer;