import React from 'react'
import { DataQuery } from '@dhis2/app-runtime'
import Entryform from './Entryform'

const query = {
    me: {
        resource: 'me',
    },
}

const MyApp = () => (
    <div >
        <DataQuery query={query}>
            {({ error, loading, data }) => {
                if (error) return <span>ERROR</span>
                if (loading) return <span>...</span>
                return (
                    <>
                        <Entryform />
                    </>
                )
            }}
        </DataQuery>
    </div>
)

export default MyApp
