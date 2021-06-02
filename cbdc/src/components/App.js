import logo from './logo.svg';
import { Tabs, Tab } from 'react-bootstrap'
import dapps from '../abis/dapps.json'
import React, { Component } from 'react'
import Token from '../abis/Token.json'
import Security from '../abis/Security.json'
import Web3 from 'web3';

import './App.css';
import './App.css';

class App extends Component {

  async componentWillMount() {
    await this.loadBlockchainData(this.props.dispatch)
    await this.loadsecurities()
    await this.loadConfirmations()
    await this.loadPendings()
    await this.loadTokenName()
    
    this.interval = setInterval(() => this.distributedTokens(), 5000);
    await this.loadOwnership()
  }

  async componentWillUnmount() {
    clearInterval(this.interval);
  }


  async loadBlockchainData(dispatch) {
    if(typeof window.ethereum!=='undefined'){
      const web3 = new Web3(window.ethereum)
      window.ethereum.enable();
      const netId = await web3.eth.net.getId()
      var accounts = await web3.eth.getAccounts()
      this.setState({web3: web3});

      window.ethereum.on('accountsChanged', (accounts)=> {
        try{
          if(typeof accounts !=='undefined'){
            console.log(accounts)
            const balance = web3.eth.getBalance(accounts[0])
            this.setState({account: accounts[0], balance: balance})
            this.loadsecurities()
            this.loadConfirmations()
            this.loadPendings()
            this.loadTokenName()
            
          } else {
            window.alert('Please login with MetaMask')
          }
        }
        catch(e){
          
        }
      });

      window.ethereum.on('networkChanged', (networkId)=>{
        console.log('networkChanged',networkId);
        try {
          window.location.reload()
          
        } catch (e) {
          console.log('Error', e)
          window.alert('Contracts not deployed to the current network')
        }
      });



      //load balance
      if(typeof accounts[0] !=='undefined'){
        const balance = await web3.eth.getBalance(accounts[0])
        this.setState({account: accounts[0], balance: balance, web3: web3})
        // console.log(this.state.account)
      } else {
        window.alert('Please login with MetaMask')
      }

      //load contracts
      try {
        const token = new web3.eth.Contract(Token.abi, Token.networks[netId].address)
        const dApps = new web3.eth.Contract(dapps.abi, dapps.networks[netId].address)
        const dappsAddress = dapps.networks[netId].address
        const tokenAddress = Token.networks[netId].address
        this.setState({token: token, dApps: dApps, dappsAddress: dappsAddress, tokenAddress: tokenAddress, })
      } catch (e) {
        console.log('Error', e)
        window.alert('Contracts not deployed to the current network')
      }
      

    } else {
      window.alert('Please install MetaMask')
    }
    
  }
  async loadOwnership(){
    var ownerships = []
    for(var i = 0; i< this.state.addresses.length; i++){
      var tempAddress = this.state.addresses[i]
      var owns = []
      //for default token
      var amount = await this.state.token.methods.balanceOf(tempAddress).call();
      if(amount > 0){
        var temp = {name: this.state.tokenName, amount: amount/10**18}
        owns.push(temp)
      }
      var j = 0
      try{
      //for securities
        for(j = 0; j< this.state.securitieslength; j++){
          amount = await this.state.securities[j]['security'].methods.balanceOf(tempAddress).call();
          if(amount >0){
            temp = {name: this.state.securities[j]['name'], amount: amount/10**18}
            owns.push(temp)
          }
        }
      }
      catch(e){
        alert(e)
      }
      ownerships.push({address: tempAddress, owns: owns})
    }
    this.setState({ownerships: ownerships})
    console.log("ownership:", ownerships)
  }

  async loadsecurities(){
    var securities = []
    var length = await this.state.dApps.methods.SecurityLength().call()
    for (var i = 0; i < length; i++){
      var security =  await this.state.dApps.methods.security(i).call()
      const tempSecurity = new this.state.web3.eth.Contract(Security.abi, security)
      const name = await tempSecurity.methods.name().call()
      securities.push({security: tempSecurity, name: name, address: security, id: i})
      this.setState({securities: securities, securitieslength: length})
      // console.log(securities)
    }
    
  }

  async loadConfirmations(){
    if(this.state.dApps!=='undefined'){
      try{
        var index = 0
        var data = [];
        var exist = true;
        do{
          var confirmations = await this.state.dApps.methods.nextConfirmations(index, this.state.account).call();
          // console.log("confirmation", confirmations);
          if(confirmations[0]&&confirmations[1]!=0){
            var temps = [];
            temps.push(await this.state.dApps.methods.GetRequest(confirmations[1]).call());
            temps.push(confirmations[1])
            data.push(temps);
            index = confirmations[1]
          }
          else{
            exist = false;
          }
        }while(exist);
        this.setState({confirmations: data})
      }
      catch (e) {
        console.log('Error, load confirmation: ', e)
      } 
    }
  }

  async loadTokenName(){
    if(this.state.dApps!=='undefined'){
      try{
        const tokenName = await this.state.token.methods.name().call()
        this.setState({tokenName: tokenName})
      }
      catch (e) {
        console.log('Error, load token name: ', e)
      } 
    }
  }
  async loadPendings(){
    if(this.state.dApps!=='undefined'){
      try{
        var index = 0;
        var data = [];
        var exist = true;
        do{
          var pendings = await this.state.dApps.methods.nextPendings(index, this.state.account).call();
          // console.log("pending", pendings);
          if(pendings[0] && pendings[1]!= 0){
            var temps = []
            temps.push(await this.state.dApps.methods.GetRequest(pendings[1]).call())
            temps.push(pendings[1]);
            data.push(temps);
            index = pendings[1]
          }
          else{
            exist = false;
          }
        }while(exist);
        this.setState({pendings: data})
      }
      catch (e) {
        console.log('Error, load confirmation: ', e)
      } 
    }
  }

//--------------------------------------------------------------------------------------------------------------------------------------------------------------------------

  async CreateSecurity(name, symbol){
    if(this.state.dApps!=='undefined'){
      
      try{
        await this.state.dApps.methods.AddSecurity(name, symbol).send({from: this.state.account})
        .on('transactionHash', (hash) => {
          var answer = window.confirm("Redirect to etherscan?")
          if (answer){
            // similar behavior as an HTTP redirect
            window.open("https://ropsten.etherscan.io/tx/" + hash);
         
          }
          
        })
        this.loadsecurities()
      } catch (e) {
        console.log('Error, issuance: ', e)
      }
    }
  }

  async issuance(to, amount){
    if(this.state.dApps!=='undefined'){
      
      try{
        await this.state.dApps.methods.issuance(to, amount.toString()).send({from: this.state.account})
        .on('transactionHash', (hash) => {
          var answer = window.confirm("Redirect to etherscan?")
          if (answer){
            // similar behavior as an HTTP redirect
            window.open("https://ropsten.etherscan.io/tx/" + hash);
         
          }
          
        })
      } catch (e) {
        console.log('Error, issuance: ', e)
      }
    }
  }

  async issuanceSecurity(to, amount, id){
    if(this.state.dApps!=='undefined'){
      
      try{
        await this.state.dApps.methods.issuanceSecurity(to, amount.toString(), id.toString()).send({from: this.state.account})
        .on('transactionHash', (hash) => {
          var answer = window.confirm("Redirect to etherscan?")
          if (answer){
            // similar behavior as an HTTP redirect
            window.open("https://ropsten.etherscan.io/tx/" + hash);
         
          }
          
        })
      } catch (e) {
        console.log('Error, issuance: ', e)
      }
    }
  }

  async transfer(to, amount){
    if(this.state.dApps!=='undefined'){
      
      try{
        
        await this.state.dApps.methods.transfer(to, amount.toString()).send({from: this.state.account})
        .on('transactionHash', (hash) => {
          var answer = window.confirm("Redirect to etherscan?")
          if (answer){
            // similar behavior as an HTTP redirect
            window.open("https://ropsten.etherscan.io/tx/" + hash);
         
          }
          
        })
      } catch (e) {
        console.log('Error, issuance: ', e)
      }
    }
  }

  async transferSecurity(to, amount, id){
    if(this.state.dApps!=='undefined'){
      
      try{
        
        await this.state.dApps.methods.transferSecurity(to, amount.toString(), id.toString()).send({from: this.state.account})
        .on('transactionHash', (hash) => {
          var answer = window.confirm("Redirect to etherscan?")
          if (answer){
            // similar behavior as an HTTP redirect
            window.open("https://ropsten.etherscan.io/tx/" + hash);
         
          }
          
        })
      } catch (e) {
        console.log('Error, issuance: ', e)
      }
    }
  }

  async redemption(amount){
    if(this.state.dApps!=='undefined'){
      try{
        await this.state.dApps.methods.redemption(amount.toString()).send({from: this.state.account})
        .on('transactionHash', (hash) => {
          var answer = window.confirm("Redirect to etherscan?")
          if (answer){
            // similar behavior as an HTTP redirect
            window.open("https://ropsten.etherscan.io/tx/" + hash);
         
          }
          
        })
      } catch (e) {
        console.log('Error, issuance: ', e)
      }
    }
  }

  async redemptionSecurity(amount, id){
    if(this.state.dApps!=='undefined'){
      try{
        await this.state.dApps.methods.redemptionSecurity(amount.toString(), id.toString()).send({from: this.state.account})
        .on('transactionHash', (hash) => {
          var answer = window.confirm("Redirect to etherscan?")
          if (answer){
            // similar behavior as an HTTP redirect
            window.open("https://ropsten.etherscan.io/tx/" + hash);
         
          }
          
        })
      } catch (e) {
        console.log('Error, issuance: ', e)
      }
    }
  }

  async requestSellSecurity(to, amount, offer, security){
    if(this.state.dApps!=='undefined'){
      
      try{
        
        await this.state.dApps.methods.RequestSellSecurity(amount.toString(), offer.toString(), to, security.toString()).send({from: this.state.account})
        .on('transactionHash', (hash) => {
          var answer = window.confirm("Redirect to etherscan?")
          if (answer){
            // similar behavior as an HTTP redirect
            window.open("https://ropsten.etherscan.io/tx/" + hash);
         
          }
          
        })
        this.loadConfirmations()
        this.loadPendings()
      } catch (e) {
        console.log('Error, Request Security: ', e)
      }
    }
  }

  async cancelRequest(node){
    if(this.state.dApps!=='undefined'){
      
      try{
        
        await this.state.dApps.methods.CancelRequest(node.toString()).send({from: this.state.account})
        .on('transactionHash', (hash) => {
          var answer = window.confirm("Redirect to etherscan?")
          if (answer){
            // similar behavior as an HTTP redirect
            window.open("https://ropsten.etherscan.io/tx/" + hash);
         
          }
          
        })
        this.loadConfirmations()
        this.loadPendings()
      } catch (e) {
        console.log('Error, Request cant be canceleld: ', e)
      }
    }
  }

  async confirmRequest(node){
    if(this.state.dApps!=='undefined'){
      
      try{
        
        await this.state.dApps.methods.ConfirmRequest(node.toString()).send({from: this.state.account})
        .on('transactionHash', (hash) => {
          var answer = window.confirm("Redirect to etherscan?")
          if (answer){
            // similar behavior as an HTTP redirect
            window.open("https://ropsten.etherscan.io/tx/" + hash);
         
          }
          
        })
        this.loadConfirmations()
        this.loadPendings()
      } catch (e) {
        console.log('Error, Request cant be canceleld: ', e)
      }
    }
  }

  async rejectRequest(node){
    if(this.state.dApps!=='undefined'){
      
      try{
        
        await this.state.dApps.methods.RejectRequest(node.toString()).send({from: this.state.account})
        .on('transactionHash', (hash) => {
          var answer = window.confirm("Redirect to etherscan?")
          if (answer){
            // similar behavior as an HTTP redirect
            window.open("https://ropsten.etherscan.io/tx/" + hash);
         
          }
          
        })
        this.loadConfirmations()
        this.loadPendings()
      } catch (e) {
        console.log('Error, Request cant be canceleld: ', e)
      }
    }
  }

  async distributedTokens(){
    if(this.state.token!=='undefined'){
      
      try{
        const supplyT = await this.state.token.methods.totalSupply().call();
        this.setState({TokenSupply: supplyT/10**18})
        if(this.state.currentSecurities != null){
          
          const securityT = await this.state.securities[parseInt(this.state.currentSecurities)]['security'].methods.totalSupply().call();
          const temp = this.state.securities[parseInt(this.state.currentSecurities)]['address']
          this.setState({SecuritySupply: securityT/10**18, currentSecurityAddress: temp})
        }
        
        
      } catch (e) {
        //console.log('Error, Supply: ', e);
      }
    }
  }

  async passCentralBankRole(newCB){
    if(this.state.dApps!=='undefined'){
      
      try{
        
        await this.state.dApps.methods.passCentralBankRole(newCB).send({from: this.state.account})
        .on('transactionHash', (hash) => {
          var answer = window.confirm("Redirect to etherscan?")
          if (answer){
            // similar behavior as an HTTP redirect
            window.open("https://ropsten.etherscan.io/tx/" + hash);
         
          }
          
        })
      } catch (e) {
        console.log('Error, Request cant be canceleld: ', e)
      }
    }
  }

  currentSecurity = (event) => {
    const temp = this.state.securities[event.target.value]['address']
    this.setState({currentSecurities: event.target.value, currentSecurityAddress: temp})
    this.distributedTokens()
  }

  

//-----------------------------------------------------------------------------------------------------------------------------------------------------------------------


ConfirmationTable() {
    var content = this.state.confirmations.map((id)=>{
      return (
        <tr key = {id[1]}>
          <th>{id[0][2]}</th>
          <th>{id[0][6]}</th>
          <th>{id[0][3]/10**18}</th>
          <th>{id[0][1]}</th>
          <th>{this.state.tokenName}</th>
          {/* <th>{this.state.token.methods.name().call()}</th> */}
          <th>{id[0][4]/10**18}</th>
          <th>
            <p>
              <button onClick = {()=>this.confirmRequest(id[1])}className='btn btn-primary'>Accept</button> 
              {'      '}
              <button onClick = {()=>this.rejectRequest(id[1])}className='btn btn-primary'>Reject</button>
            </p>
          </th>
        </tr>)
    })
    return <tbody>{ content } </tbody>
  }
  PendingTable() {
    var content = this.state.pendings.map((id)=>{
      return (
        <tr key = {id[1]}>
          <th>{id[0][2]}</th>
          <th>{id[0][6]}</th>
          <th>{id[0][3]/10**18}</th>
          <th>{id[0][1]}</th>
          <th>{this.state.tokenName}</th>
          <th>{id[0][4]/10**18}</th>
          <th>
              <button onClick = {()=>this.cancelRequest(id[1])}className='btn btn-primary'>Cancel</button>
          </th>
        </tr>)
    })
    return <tbody>{ content } </tbody>
  }

  SecuritySelect(name){
    var securities = this.state.securities.map((security)=>{
      return(
        <option value={security["id"]}>{security["name"]}-{security["address"]}</option>
      )
    })
    return(
      <select name={name} id={name}ref={(input) => { this[name] = input }} className="form-control form-control-md">
          {securities}
      </select>
    )
  }

  ownershipsTable(){
    var content = this.state.ownerships.map((owner)=>{
      return (
        <div>
          <h5 style={{float: "left"}}>{owner.address}</h5>
          <table class="table table-bordered">
            <thead class="thead-dark">
              <tr>
                <th scope="col">Asset</th>
                <th scope="col">Amount</th>
              </tr>
            </thead>
            {owner.owns.map((own)=>{
              return(
                <tr>
                  <th>{own.name}</th>
                  <th>{own.amount}</th>
                </tr>
              )
            })}
          </table>
          <br></br>
        </div>)
    })
    return content
  }

  



  constructor(props) {
    super(props)
    this.state = {
      web3: 'undefined',
      account: '',
      token: null,
      dApps: null,
      balance: 0,
      dappsAddress: null,
      confirmations:[],
      pendings: [],
      tokenName: '',
      securities: [],
      currentSecurities: 0,
      ownerships: [],
      addresses: ['0x2Bc21201Bc07acdB52E803a31edb4a2Cd6221C3E', '0x101a3B2DC23cD3CeC90A6a5B8994B121E78fE811','0xCb4B879Ad327373EE5A198EDe6658437231a8321']
    }
    this.ConfirmationTable = this.ConfirmationTable.bind(this);
  }

  render() {
    return (
      <div className='text-monospace'>
        <nav className="navbar navbar-dark fixed-top bg-dark flex-md-nowrap p-0 shadow">
        <div>
          <img src={logo} className="App-logo" alt="logo" height="10"/>
          <b className="navbar-brand" style={{float: "left", lineHeight: "35px"}}>CBDC</b>
        </div>
  
        </nav>
        <div className="container-fluid mt-5 text-center">
        <br></br>
          <h1>Welcome to CBDC</h1>
          <h2>{this.state.account}</h2>
          <br></br>
          <div className="row">
            <main role="main" className="col-lg-12 d-flex text-center">
              <div className="content mr-auto ml-auto" >
              <Tabs fill defaultActiveKey="profile" id="uncontrolled-tab-example" >

              <Tab eventKey="SetTokenIssuer" title="Set Token Issuer">
                  <div>
                  <br></br>
                    Change Issuer
                    <br></br>

                    <form onSubmit={(e) => {
                      e.preventDefault()
                      let to = this.TokenIssuer.value
                      this.passCentralBankRole(to)
                      
                    }}>
                      <div className='form-group mr-sm-2'>
                      <br></br>
                        <label for="TokenIssuer" style={{float: "left"}}>Token Issuer:</label>
                        <input
                          id='TokenIssuer'
                          type='text'
                          ref={(input) => { this.TokenIssuer = input }}
                          className="form-control form-control-md"
                          placeholder='to...'
                          required />
      
                      </div>
                      <button type='submit' className='btn btn-primary'>Set</button>
                    </form>

                  </div>
                </Tab>

                <Tab eventKey="CreatesSecurity" title="Create Security">
                <div>
                  <br></br>
                    Create security
                    <br></br>

                    <form onSubmit={(e) => {
                      e.preventDefault()
                      let name = this.SecurityName.value
                      let symbol = this.SecuritySymbol.value
                      this.CreateSecurity(name, symbol)
                      
                    }}>
                      <div className='form-group mr-sm-2'>
                      <br></br>
                        <label for="SecurityName" style={{float: "left"}}>Name:</label>
                        <input
                          id='SecurityName'
                          type='text'
                          ref={(input) => { this.SecurityName = input }}
                          className="form-control form-control-md"
                          placeholder='Name...'
                          required />

                        <label for="SecuritySymbol" style={{float: "left"}}>Symbol:</label>
                        <input
                          id='SecuritySymbol'
                          type='text'
                          ref={(input) => { this.SecuritySymbol = input }}
                          className="form-control form-control-md"
                          placeholder='Symbol...'
                          required />
      
                      </div>
                      <button type='submit' className='btn btn-primary'>Create</button>
                    </form>

                  </div>
                </Tab>

                <Tab eventKey="supply" title="Total supply">
                  <div>

                  <br></br>
                  <p style={{float: "left"}}>
                    token supply ({this.state.tokenAddress}): {this.state.TokenSupply}
                  </p>
                    
                    <br></br>
                    <br></br>
                    <label for="SupplySecurity" style={{float: "left"}}>Security:</label>
                    
                    <select name="SupplySecurity" id="SupplySecurity"  onChange={this.currentSecurity} ref={(input) => { this.SupplySecurity = input }} className="form-control form-control-md">
                          {this.state.securities.map((security)=>{
                            return(
                              <option value={security["id"]}>{security["name"]}-{security["address"]}</option>
                            )
                          })}
                        </select>
                    <p style={{float: "left"}}>
                      Supply {this.state.currentSecurityAddress} : {this.state.SecuritySupply}
                    </p>

                    
                  </div>
                </Tab>

                <Tab eventKey="SellSecurity" title="Sell Security">
                  <div>

                  <br></br>
                    How much to Sell?
                    <br></br>
                    <form onSubmit={(e) => {
                      e.preventDefault()
                      let amount = this.SellAmount.value
                      let offer = this.RequestOffer.value
                      let to = this.RequestAddress.value
                      let security  = this.TypeSecurity.value
                      amount = amount * 10**18 //convert to wei
                      offer = offer * 10**18 //convert to wei

                      this.requestSellSecurity(to, amount, offer, security)
                    }}>
                      <div className='form-group mr-sm-2'>
                      <br></br>

                        <p style={{float: "left", margin : 0}}>Seller: {this.state.account}</p>
                        <br></br>
                        <br></br>
                        <label for="TypeSecurity" style={{float: "left"}}>Token Sell:</label>
                        
                        {this.SecuritySelect("TypeSecurity")}

                        <label for="SellAmount" style={{float: "left"}}>Amount Sell:</label>
                        <input
                          id='SellAmount'
                          step="0.01"
                          type='number'
                          ref={(input) => { this.SellAmount = input }}
                          className="form-control form-control-md"
                          placeholder='amount...'
                          required />

                        <label for="RequestAddress" style={{float: "left"}}>Buyer:</label>
                        <input
                          id='RequestAddress'
                          type='text'
                          ref={(input) => { this.RequestAddress = input }}
                          className="form-control form-control-md"
                          placeholder='to...'
                          required />
                        <br></br>
                        <p style={{float: "left", margin : 0}}>Token Buy: {this.state.tokenName}</p>
                        <br></br>
                        <br></br>
                        <label for="RequestOffer" style={{float: "left"}}>Amount Buy:</label>
                        <input
                          id='RequestOffer'
                          step="0.01"
                          type='number'
                          ref={(input) => { this.RequestOffer = input }}
                          className="form-control form-control-md"
                          placeholder='offer...'
                          required />

                        
                        
                      </div>
                      <button type='submit' className='btn btn-primary'>Sell</button>
                    </form>

                  <br></br>
                    <table class="table table-dark">
                      <thead>
                        <tr>
                          <th scope="col">Seller</th>
                          <th scope="col">Token Sell</th>
                          <th scope="col">Amount Sell</th>
                          <th scope="col">Buyer</th>
                          <th scope="col">Token Buy</th>
                          <th scope="col">Amount Buy</th>
                          <th scope="col">Action</th>
                        </tr>
                      </thead>
                      {this.PendingTable()}
                    </table>
                  </div>
                </Tab>

                <Tab eventKey="confirmSecurity" title="Confirm Security">
                  <div>
                  <br></br>
                  <table class="table table-dark">
                      <thead>
                        <tr>
                          <th scope="col">Seller</th>
                          <th scope="col">Token Sell</th>
                          <th scope="col">Amount Sell</th>
                          <th scope="col">Buyer</th>
                          <th scope="col">Token Buy</th>
                          <th scope="col">Amount Buy</th>
                          <th scope="col">Action</th>
                        </tr>
                      </thead>
                      {this.ConfirmationTable()}
                    </table>
                  </div>
                </Tab>

                <Tab eventKey="issuance" title="issuance">
                  <div>
                  <br></br>
                    How much issuance?
                    <br></br>
                    <form onSubmit={(e) => {
                      e.preventDefault()
                      let amount = this.IssuanceAmount.value
                      let to = this.Issuanceaddress.value
                      let type = this.TypeIssuance.value
                      console.log(type)
                      amount = amount * 10**18 //convert to wei
                      if (type === "Token"){
                        this.issuance(to,amount)
                      }
                      else{
                        this.issuanceSecurity(to,amount,type)
                      }
                    }}>
                      <div className='form-group mr-sm-2'>
                      <br></br>
                        <label for="Issuanceaddress" style={{float: "left"}}>Node Address:</label>
                        <input
                          id='Issuanceaddress'
                          type='text'
                          ref={(input) => { this["Issuanceaddress"] = input }}
                          className="form-control form-control-md"
                          placeholder='to...'
                        required />

                        <label for="TypeIssuance" style={{float: "left"}}>Token Issued:</label>
                        <select name="TypeIssuance" id="TypeIssuance" 
                          ref={(input) => { this.TypeIssuance = input }} 
                          className="form-control form-control-md">
                          <option selected value="Token">Token ({this.state.tokenAddress})</option>
                          {this.state.securities.map((security)=>{
                            return(
                              <option value={security["id"]}>{security["name"]}-{security["address"]}</option>
                            )
                          })}
                        </select>
                        
                        <label for="IssuanceAmount" style={{float: "left"}}>Amount:</label>
                        <input
                          id='IssuanceAmount'
                          step="0.01"
                          type='number'
                          ref={(input) => { this.IssuanceAmount = input }}
                          className="form-control form-control-md"
                          placeholder='amount...'
                          required />

                        
                      </div>
                      <button type='submit' className='btn btn-primary'>Issuance</button>
                    </form>

                  </div>
                </Tab>
                

                <Tab eventKey="redemption" title="redemption">
                  <div>
                  <br></br>
                  How much redemption?
                    <br></br>
                    <form onSubmit={(e) => {
                      e.preventDefault()
                      let amount = this.RedemptionAmount.value
                      let type = this.TypeRedeem.value
                      amount = amount * 10**18 //convert to wei
                      if (type === "Token"){
                        this.redemption(amount)
                      }
                      else {
                        this.redemptionSecurity(amount, type)
                      }
                      
                    }}>
                      <div className='form-group mr-sm-2'>
                      <br></br>
                        <p style={{float: "left", margin : 0}}>Node Address: {this.state.account}</p>
                        <br></br>
                        <br></br>

                        <label for="TypeRedeem" style={{float: "left"}}>Token Redeem:</label>
                        <select name="TypeRedeem" id="TypeRedeem" ref={(input) => { this.TypeRedeem = input }} className="form-control form-control-md">
                          <option selected value="Token">Token-{this.state.tokenAddress}</option>
                          {this.state.securities.map((security)=>{
                            return(
                              <option value={security["id"]}>{security["name"]}-{security["address"]}</option>
                            )
                          })}
                        </select>
                        <label for="RedemptionAmount" style={{float: "left"}}>Amount:</label>
                        <input
                          id='RedemptionAmount'
                          step="0.01"
                          type='number'
                          ref={(input) => { this.RedemptionAmount = input }}
                          className="form-control form-control-md"
                          placeholder='amount...'
                          required />

                      </div>
                      <button type='submit' className='btn btn-primary'>Redemption</button>
                    </form>

                  </div>
                </Tab>


                <Tab eventKey="transfer" title="transfer">
                  <div>
                  <br></br>
                    How much to Transfer?
                    <br></br>

                      

                    <form onSubmit={(e) => {
                      e.preventDefault()
                      let amount = this.TransferAmount.value
                      let to = this.Transferaddress.value
                      let type = this.TypeTransfer.value
                      amount = amount * 10**18 //convert to wei
                      if (type === "Token"){
                        this.transfer(to,amount)
                      }
                      else {
                        this.transferSecurity(to, amount, type)
                      }
                      
                    }}>
                      <div className='form-group mr-sm-2'>
                      <br></br>
                        <label for="Transferaddress" style={{float: "left"}}>To:</label>
                        <input
                          id='Transferaddress'
                          type='text'
                          ref={(input) => { this.Transferaddress = input }}
                          className="form-control form-control-md"
                          placeholder='to...'
                          required />

                        <label for="TypeTransfer" style={{float: "left"}}>Token Transfer:</label>
                        <select name="TypeTransfer" id="TypeTransfer" ref={(input) => { this.TypeTransfer = input }} className="form-control form-control-md">
                          <option selected value="Token">Token-{this.state.tokenAddress}</option>
                          {this.state.securities.map((security)=>{
                            return(
                              <option value={security["id"]}>{security["name"]}-{security["address"]}</option>
                            )
                          })}
                        </select>

                        <label for="TransferAmount" style={{float: "left"}}>Amount:</label>
                        <input
                          id='TransferAmount'
                          step="0.01"
                          type='number'
                          ref={(input) => { this.TransferAmount = input }}
                          className="form-control form-control-md"
                          placeholder='amount...'
                          required />

                        
                      </div>
                      <button type='submit' className='btn btn-primary'>Transfer</button>
                    </form>

                  </div>
                </Tab>

                <Tab eventKey="Ownerships" title="Ownerships">
                  <div>
                    <br></br>
                    Ownerships
                    <br></br>
                    <br></br>
                    <br></br>
                    {this.ownershipsTable()}
                  </div>
                </Tab>


              </Tabs>
              </div>
            </main>
          </div>
        </div>
      </div>
    );
  }
}

export default App;
