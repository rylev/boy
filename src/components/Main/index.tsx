import * as React from 'react'
import RomInput  from '../RomInput'

class Main extends React.Component<{}, {}> {
    render () {
        return (<div>
            <p>Upload file</p>
            <RomInput />
         </div>)
    }
}

export default Main