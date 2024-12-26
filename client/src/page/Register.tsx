import axios, { AxiosError } from "axios";
import React, { useState } from "react";
import { Link } from "react-router-dom";

const Register = () => {
  const [value, setValue] = useState({
    name: "",
    email: "",
    password: "",
  });

  const [error,setError] = useState('')

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setError('')
    setValue((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const handleRegister = () => {
    setError('')
    axios.post('http://localhost:5555/register',value).then(({data})=>{
      console.log(data)
      localStorage.setItem('user', JSON.stringify(data))
    }).catch(err=>{
      console.log(err)
      if(err instanceof AxiosError) {
        setError(err.response?.data.message)
      }
    })
  };

  return (
    <div className="flex flex-col h-full gap-4 items-center justify-center w-full">
      <input
        onChange={handleChange}
        type="text"
        name="name"
        value={value.name}
        placeholder="Name"
        required
        className="px-2 py-1 text-black rounded-sm"
      />
      <input
        onChange={handleChange}
        type="email"
        name="email"
        value={value.email}
        placeholder="email"
        required
        className="px-2 py-1 text-black rounded-sm"
      />
      <input
        onChange={handleChange}
        type="password"
        name="password"
        value={value.password}
        placeholder="password"
        required
        className="px-2 py-1 text-black rounded-sm"
      />
      <div className="flex gap-4">
        Already have an account?
        <Link to="/login" className="text-blue-600">
          login
        </Link>
      </div>

      <button onClick={handleRegister} className="px-2 py-1 text-white bg-blue-600 rounded-sm">Register</button>

      {error && <p className="text-red-600">{error}</p>}
    </div>
  );
};

export default Register;
